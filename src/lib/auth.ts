import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { db } from './db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
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
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          const email = user.email;
          
          if (!email) {
            console.error('Google signIn error: No email received from Google');
            return false;
          }
          
          // Find or create user
          let dbUser = await db.user.findFirst({
            where: { email },
          });

          if (!dbUser) {
            dbUser = await db.user.create({
              data: {
                email,
                name: user.name || '',
                image: user.image,
                googleId: account.providerAccountId,
                role: 'USER',
              },
            });
          } else if (!dbUser.googleId) {
            await db.user.update({
              where: { id: dbUser.id },
              data: { 
                googleId: account.providerAccountId,
                image: dbUser.image || user.image,
              },
            });
          }
          return true;
        } catch (error) {
          console.error('Google signIn callback error:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      // First sign in
      if (account && user) {
        if (account.provider === 'google') {
          // Find our DB user by email
          const dbUser = await db.user.findUnique({
            where: { email: user.email! },
            select: { id: true, role: true, lang: true, telegramId: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.lang = dbUser.lang;
            token.telegramId = dbUser.telegramId;
          }
        } else {
          // Telegram credentials
          token.id = user.id;
        }
      }

      // Refresh user data periodically
      if (token.id && !token.role) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { id: true, role: true, lang: true, telegramId: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.lang = dbUser.lang;
          token.telegramId = dbUser.telegramId;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).lang = token.lang;
        (session.user as any).telegramId = token.telegramId;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle locale-prefixed URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      // Default redirect to dashboard
      return `${baseUrl}/dashboard`;
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
