require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const PORT = 3000 || proccess.env.PORT;
const app = express();
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');


app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set("view engine", "ejs");

app.use(session({
    secret: 'MySecret',
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://jatin_parashar:apple%40pieA1@cluster0.njgfycg.mongodb.net/?retryWrites=true&w=majority/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get("/", (req, res) => {
    res.render("home");
})
app.get("/auth/google", passport.authenticate('google', { scope: ['profile'] }));

app.get("/auth/google/secrets", passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect the secrets.
        res.redirect("/secrets")
    });
app.get("/login", (req, res) => {
    res.render("login");
})

app.get("/register", (req, res) => {
    res.render("register");
})

app.post("/register", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    User.register({ username: username }, password, (err, user) => {
        if (err) {
            console.log(err);
            res.redirect("/register");
        }
        else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            })
        }
    })
})

app.post("/login", (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, (err) => {
        if (err) console.log(err);
        else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            });
        }
    })


})

app.get("/secrets", (req, res) => {
    // if (req.isAuthenticated()) res.render("secrets");
    // else res.redirect("/login");
    User.find({ "secret": { $ne: null } }, ((err, foundUsers) => {
        if (err) console.log(err);
        else {
            if (foundUsers) {
                res.render("secrets", { userWithSecrets: foundUsers })
            }
        }
    }));
    //This will npo longer be a previlged page

});
app.get("/submit", (req, res) => {
    if (req.isAuthenticated()) res.render("submit");
    else res.redirect("/login");
});

app.post("/submit", (req, res) => {
    const submmitedSecret = req.body.secret;
    // passport saves the user details in req variable
    console.log(req.user._id);
    const ID = req.user._id;
    User.findById(ID, (err, founduser) => {
        if (err) console.log(err);
        else {
            if (founduser) {
                founduser.secret = submmitedSecret;
                founduser.save(() => {
                    res.redirect("/secrets");
                })
            }
        }
    })
})

app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});


app.listen(PORT, () => { console.log("Server started at 3000") });