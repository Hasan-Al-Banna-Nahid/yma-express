import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import User from "../modules/Auth/user.model";
import { config } from "./config";

passport.serializeUser((user: any, done) => {
  done(null, user?.id ?? user?._id?.toString?.());
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user ?? undefined);
  } catch (err) {
    done(err as Error);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId || "",
      clientSecret: config.google.clientSecret || "",
      callbackURL: config.google.callbackUrl,
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done,
    ) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email) {
          return done(new Error("Google account has no email"), undefined);
        }

        let user =
          (await User.findOne({
            $or: [{ googleId: profile.id }, { email }],
          }).select("+password")) ?? null;

        if (!user) {
          const firstName = profile.name?.givenName ?? "";
          const lastName = profile.name?.familyName ?? "";
          const displayName =
            profile.displayName || [firstName, lastName].filter(Boolean).join(" ");

          user = await User.create({
            name: displayName || email.split("@")[0],
            firstName,
            lastName,
            email,
            googleId: profile.id,
            photo: profile.photos?.[0]?.value ?? null,
            isEmailVerified: true,
            role: "user",
          });
        } else if (!user.googleId) {
          if (user.password) {
            return done(
              new Error("This email is registered with a password. Use email login."),
              undefined,
            );
          }
          user.googleId = profile.id;
          if (!user.photo && profile.photos?.[0]?.value) {
            user.photo = profile.photos[0].value;
          }
          if (!user.isEmailVerified) {
            user.isEmailVerified = true;
          }
          await user.save({ validateBeforeSave: false });
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error, undefined);
      }
    },
  ),
);

export default passport;
