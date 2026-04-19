// import { Strategy as TwitterStrategy } from 'passport-twitter';
// import { Profile } from 'passport';
// import { Request } from 'express';
// import databaseServices from '~/services/database.services';
// import { UserVerificationStatus, UserStatus } from '~/constants/enum/user.enum';

// export const twitterStrategy = new TwitterStrategy(
//   {
//     consumerKey: env.twitterApiKey,
//     consumerSecret: env.twitterApiSecretKey,
//     callbackURL: env.twitterCallbackURL,
//     includeEmail: true,
//     passReqToCallback: true,
//     userAuthorizationURL: 'https://api.twitter.com/oauth/authenticate',
//   },
//   async (
//     req: Request,
//     token: string,
//     tokenSecret: string,
//     profile: Profile,
//     done: (error: any, user?: any) => void,
//   ) => {
//     try {
//       console.log('Twitter strategy executing', {
//         hasProfile: !!profile,
//         profileId: profile?.id,
//         hasToken: !!token,
//       });

//       // Kiểm tra user đã tồn tại với Twitter ID
//       let user = await databaseServices.users.findOne({
//         'oauth.twitter.id': profile.id,
//       });

//       if (user) {
//         // Update last active time và return user
//         await databaseServices.users.updateOne(
//           { _id: user._id },
//           {
//             $set: {
//               'activity.lastActiveAt': new Date(),
//               updatedAt: new Date(),
//             },
//           },
//         );
//         return done(null, user);
//       }

//       const email = profile.emails?.[0]?.value;
//       const username = profile.username || `twitter_${profile.id}`;

//       // Kiểm tra user đã tồn tại với email (nếu có)
//       if (email) {
//         user = await databaseServices.users.findOne({ email });
//       }

//       if (!user) {
//         // Tạo user mới từ Twitter profile
//         const newUserData = {
//           username: username,
//           fullName: profile.displayName || username,
//           email: email || undefined,
//           avatarUrl: profile.photos?.[0]?.value || '',
//           timezone: 'UTC',
//           jobTitle: undefined,
//           department: undefined,
//           bio: undefined,
//           location: undefined,
//           subscription: undefined,
//           // Core fields
//           skills: [],
//           verify: email
//             ? UserVerificationStatus.Verified
//             : UserVerificationStatus.Unverified, // Verify nếu có email
//           status: UserStatus.Active,
//           tier: 'free' as const,
//           oauth: {
//             twitter: {
//               id: profile.id,
//               username: profile.username || '',
//               email: email || undefined,
//               verified: true,
//               connectedAt: new Date(),
//             },
//           },
//           security: {
//             twoFactorEnabled: false,
//             lastPasswordChange: new Date(),
//             loginAttempts: 0,
//           },
//           activity: {
//             lastActiveAt: new Date(),
//             loginCount: 0,
//           },
//           metadata: {
//             onboardingCompleted: false,
//             tourCompleted: false,
//             betaFeatures: [],
//             experiments: [],
//             tags: [],
//           },
//           createdAt: new Date(),
//           updatedAt: new Date(),
//         };

//         const result = await databaseServices.users.insertOne(newUserData);
//         user = await databaseServices.users.findOne({ _id: result.insertedId });
//       } else {
//         // User đã tồn tại với email, cập nhật OAuth info
//         await databaseServices.users.updateOne(
//           { _id: user._id },
//           {
//             $set: {
//               'oauth.twitter': {
//                 id: profile.id,
//                 username: profile.username || '',
//                 email: email || undefined,
//                 verified: true,
//                 connectedAt: new Date(),
//               },
//               'activity.lastActiveAt': new Date(),
//               updatedAt: new Date(),
//             },
//           },
//         );
//         user = await databaseServices.users.findOne({ _id: user._id });
//       }

//       if (user) {
//         return done(null, user);
//       } else {
//         return done(new Error('User creation failed'), false);
//       }
//     } catch (error) {
//       console.error('Twitter strategy error:', error);
//       return done(error, false);
//     }
//   },
// );
