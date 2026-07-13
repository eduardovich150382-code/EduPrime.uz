import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from './db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
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
          // Update username if changed
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
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }

      // Fetch additional user data
      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            role: true,
            lang: true,
            telegramId: true,
            telegramUsername: true,
          },
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
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        // Link Google account to existing user or create new
        const existingUser = await db.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          await db.user.create({
            data: {
              email: user.email,
              name: user.name,
              image: user.image,
              googleId: account.providerAccountId,
              role: 'USER',
            },
          });
        } else if (!existingUser.googleId) {
          await db.user.update({
            where: { id: existingUser.id },
            data: { googleId: account.providerAccountId },
          });
        }
      }
      return true;
    },
  },
});

// Verify Telegram auth token
async function verifyTelegramToken(telegramId: string, token: string): Promise<boolean> {
  try {
    // Check if token exists in our system settings (temporary auth tokens)
    const storedToken = await db.systemSetting.findUnique({
      where: { key: `telegram_auth_${telegramId}` },
    });

    if (!storedToken) return false;

    // Check if token matches and not expired (5 minutes window)
    const tokenData = JSON.parse(storedToken.value);
    const isValid = tokenData.token === token;
    const isNotExpired = Date.now() - tokenData.createdAt < 5 * 60 * 1000;

    if (isValid && isNotExpired) {
      // Delete used token
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
