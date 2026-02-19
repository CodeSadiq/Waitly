import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import Staff from "../models/Staff.js";
import Admin from "../models/Admin.js";
import dotenv from "dotenv";

dotenv.config();

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID || "MOCK_CLIENT_ID",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "MOCK_CLIENT_SECRET",
            callbackURL: `${process.env.BACKEND_URL || "http://localhost:5000"}/api/auth/google/callback`,
            passReqToCallback: true,
        },
        async (req, accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails[0].value;
                const name = profile.displayName;
                const role = req.query.state || "user"; // We pass role via state

                let account = await User.findOne({ email });
                if (!account) {
                    account = await Staff.findOne({ email });
                    if (!account) {
                        account = await Admin.findOne({ email });
                    }
                }

                if (account) {
                    // Update last login
                    account.lastLogin = new Date();
                    if (!account.isVerified && account.role !== 'staff') {
                        account.isVerified = true;
                    }
                    await account.save();
                    return done(null, account);
                }

                // Create new account if not found
                let newAccount;
                if (role === "staff") {
                    newAccount = await Staff.create({
                        username: name.replace(/\s+/g, "_").toLowerCase() + "_" + Math.random().toString(36).substr(2, 4),
                        email,
                        password: Math.random().toString(36), // Random password for social login
                        status: "unassigned",
                        lastLogin: new Date(),
                    });
                } else {
                    newAccount = await User.create({
                        username: name.replace(/\s+/g, "_").toLowerCase() + "_" + Math.random().toString(36).substr(2, 4),
                        email,
                        password: Math.random().toString(36),
                        role: role,
                        isVerified: true,
                        lastLogin: new Date(),
                    });
                }

                return done(null, newAccount);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

// We don't use passport sessions since we use JWT cookies
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

export default passport;
