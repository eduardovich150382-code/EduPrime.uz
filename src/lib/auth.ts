import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { db } from './db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours — foydalanuvchi har 24 soatda qayta login qiladi
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      id: 'telegram',
      name: 'Telegram',
      credentials: {
        telegramId: { label: 'Telegram ID', type: 'text' },
        telegramUsername: { label: 'Username', type: 'text' },
        firstName: { label: 'First Name', type: 'text' },
        authToken: { label: 'Auth Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.telegramId || !credentials?.authToken) {
          return null;
        }

        const telegramId = credentials.telegramId as string;
        const telegramUsername = credentials.telegramUsername as string;
        const firstName = credentials.firstName as string;
        const authToken = credentials.authToken as string;

        try {
          // Verify the token from our Telegram bot
          const isValid = await verifyTelegramToken(telegramId, authToken);
          if (!isValid) {
            return null;
          }

          // Find or create user
          let user = await db.user.findUnique({
            where: { telegramId },
          });

          if (!user) {
            user = await db.user.create({
              data: {
                telegramId,
                telegramUsername,
                name: firstName || telegramUsername || 'Telegram User',
                role: 'USER',
              },
            });
          } else {
            if (telegramUsername && user.telegramUsername !== telegramUsername) {
              user = await db.user.update({
                where: { id: user.id },
                data: { telegramUsername },
              });
            }
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          };
        } catch (error) {
          console.error('[Auth] Telegram authorize error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn() {
      // Always allow sign-in for all providers
      return true;
    },
    async jwt({ token, user, account, profile, trigger, session: updateData }) {
      // Handle session updates from client (e.g., name/image change in profile)
      if (trigger === 'update' && updateData) {
        if (updateData.name) {
          token.name = updateData.name;
        }
        if (updateData.image) {
          token.picture = updateData.image;
        }
        return token;
      }

      if (account && user) {
        // Store provider info in token on first sign-in
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;

        if (account.provider === 'google') {
          // Store Google user info directly in token
          // DB sync will happen lazily in session callback
          token.email = user.email;
          token.name = user.name;
          token.picture = user.image;
          token.googleId = account.providerAccountId;
          // Mark that we need to sync with DB
          token.needsDbSync = true;
        } else if (account.provider === 'telegram') {
          // Telegram user already created in authorize()
          token.id = user.id;
          token.name = user.name;
          token.email = user.email;
          token.picture = user.image;
        }
      }

      // Lazy DB sync for Google users
      if (token.needsDbSync && token.email) {
        try {
          let dbUser = await db.user.findUnique({
            where: { email: token.email as string },
          });

          if (!dbUser) {
            dbUser = await db.user.create({
              data: {
                email: token.email as string,
                name: (token.name as string) || '',
                image: (token.picture as string) || null,
                googleId: token.googleId as string,
                role: 'USER',
              },
            });
          } else if (!dbUser.googleId) {
            dbUser = await db.user.update({
              where: { id: dbUser.id },
              data: {
                googleId: token.googleId as string,
                image: dbUser.image || (token.picture as string) || null,
              },
            });
          }

          token.id = dbUser.id;
          token.role = dbUser.role;
          token.lang = dbUser.lang;
          token.telegramId = dbUser.telegramId;
          token.needsDbSync = false;
        } catch (error) {
          console.error('[Auth] JWT DB sync error:', error);
          // Don't block sign-in, will retry on next request
        }
      }

      // Refresh user role if missing (for returning users)
      if (token.id && !token.role && !token.needsDbSync) {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, role: true, lang: true, telegramId: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.lang = dbUser.lang;
            token.telegramId = dbUser.telegramId;
          }
        } catch (error) {
          console.error('[Auth] JWT user refresh error:', error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.id) {
          session.user.id = token.id as string;
        }
        if (token.name) {
          session.user.name = token.name as string;
        }
        if (token.picture) {
          session.user.image = token.picture as string;
        }
        (session.user as any).role = token.role || 'USER';
        (session.user as any).lang = token.lang || 'uz';
        (session.user as any).telegramId = token.telegramId;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/tests`;
    },
  },
});

// Verify Telegram auth token
async function verifyTelegramToken(telegramId: string, token: string): Promise<boolean> {
  try {
    const storedToken = await db.systemSetting.findUnique({
      where: { key: `telegram_auth_${telegramId}` },
    });

    if (!storedToken) return false;

    const tokenData = JSON.parse(storedToken.value);
    const isValid = tokenData.token === token;
    const isNotExpired = Date.now() - tokenData.createdAt < 5 * 60 * 1000;

    if (isValid && isNotExpired) {
      await db.systemSetting.delete({
        where: { key: `telegram_auth_${telegramId}` },
      });
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
