import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from './mongodb';
import User from '@/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/user.phonenumbers.read',
        },
      },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          await connectDB();
          
          const user = await User.findOne({ 
            email: credentials.email.toLowerCase(),
            provider: 'email'
          });

          if (!user || !user.password) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          
          if (!isPasswordValid) {
            return null;
          }

          // Check if email is verified
          if (!user.emailVerified) {
            throw new Error('EMAIL_NOT_VERIFIED');
          }

          // Update last login
          await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

          return {
            id: user._id,
            email: user.email,
            name: user.name,
            image: user.profilePicture,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          await connectDB();
          
          // Fetch phone number from Google People API
          let phoneNumber = null;
          if (account.access_token) {
            try {
              const peopleResponse = await fetch(
                `https://people.googleapis.com/v1/people/me?personFields=phoneNumbers`,
                {
                  headers: {
                    Authorization: `Bearer ${account.access_token}`,
                  },
                }
              );
              
              if (peopleResponse.ok) {
                const peopleData = await peopleResponse.json();
                if (peopleData.phoneNumbers && peopleData.phoneNumbers.length > 0) {
                  phoneNumber = peopleData.phoneNumbers[0].value;
                }
              }
            } catch (phoneError) {
              console.log('Could not fetch phone number:', phoneError);
              // Continue without phone number - not critical
            }
          }
          
          // Check if user exists
          const existingUser = await User.findOne({ 
            $or: [
              { email: user.email },
              { providerId: account.providerAccountId }
            ]
          });

          if (existingUser) {
            // Update last login and phone number if available
            const updateData: any = { 
              lastLogin: new Date(),
              profilePicture: user.image 
            };
            
            if (phoneNumber && !existingUser.phone) {
              updateData.phone = phoneNumber;
            }
            
            await User.findByIdAndUpdate(existingUser._id, updateData);
            return true;
          }

          // Create new user
          await User.create({
            name: user.name || '',
            email: user.email || '',
            phone: phoneNumber || '',
            provider: 'google',
            providerId: account.providerAccountId,
            emailVerified: true,
            profilePicture: user.image,
            lastLogin: new Date(),
          });

          return true;
        } catch (error) {
          console.error('Google sign-in error:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
