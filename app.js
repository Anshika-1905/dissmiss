//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mysql = require("mysql");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const multer = require('multer');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// mongo connection
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

// user schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

// women schema
const womenSchema = new mongoose.Schema({
  sellerName: String,
  email: String,
  productName: String,
  size: Array,
  description: String,
  image: String,
  price: String,
  count: String,
});
const Women = mongoose.model("women", womenSchema);

// men schema
const menSchema = new mongoose.Schema({
  sellerName: String,
  email: String,
  productName: String,
  size: Array,
  description: String,
  image: String,
  price: String,
  count: String,
});
const Men = mongoose.model("men", menSchema);

// cart Schema
const cartSchema = new mongoose.Schema({
  productName: String,
  size: Array,
  description: String,
  price: Number,
  count: String,
});
const Cart = mongoose.model("cart", cartSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/dissmiss",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

// image
// SET STORAGE
var storage = multer.diskStorage({

  destination: function(req, file, cb) {
    cb(null, 'public/uploads/women')
  },
  filename: function(req, file, cb) {
    cb(null, file.fieldname + i + '.jpg');
    i++;
  }

})

var upload = multer({
  storage: storage
})

var i = 1;
var count = 0;

app.get("/", function(req, res) {
  res.render('home')
})

app.get("/covid", function(req, res) {
  res.render('covid')
})

app.get("/sell", function(req, res) {
  res.render('sell')
})

app.get("/shop", function(req, res) {
  res.render('shop')
})

app.get("/women", function(req, res) {
  Women.find(function(err, foundWomen) {
    if (err) {
      console.log(err);
    } else {
      if (foundWomen) {
        res.render("women", {foundWomen: foundWomen});
      }
    }
  });
})

app.get("/men", function(req, res) {
  res.render('men')
})

app.get("/thankyou", function(req, res) {
  res.render('thankyou')
})

app.get("/signup", function(req, res) {
  res.render('signup')
})

app.get("/register", function(req, res) {
  res.render('register')
})

app.get("/login", function(req, res) {
  res.render('login')
})

app.get("/cart1", function(req, res) {
  res.render('cart1')
})

app.get("/checkout", function(req, res){
  res.render('checkout')
})

app.get("/cart", function(req, res){
  Cart.find(function(err, foundCart) {
    if (err) {
      console.log(err);
    } else {
      if (foundCart) {
        res.render("cart", {foundCart: foundCart});
      }else{
        res.render("emptycart");
      }
    }
  });
})

app.get("/payment", function(req, res){
  res.render("payment")
})

app.post("/payment", function(req, res){
  res.redirect("/payment");
})

app.post("/remove", function(req, res){
  let deleteTaskID = req.body.delete;
  Cart.deleteOne({
    _id: deleteTaskID
  }, function(err) {
    if (err) {
      console.log(err);
    } else {
      console.log("Delete successful.");
    }
    res.redirect("/cart");
  });
})

app.post("/sell", upload.single('productImage'), function(req, res) {

  count++;
  var sellerName = req.body.sellerName;
  var email = req.body.sellerEmail;
  var gender = req.body.gender;
  var productName = req.body.productName;
  var size = req.body.productSize;
  var description = req.body.description;
  var image = req.file.productImage;
  var price = req.body.price;

  if (gender === "WOMEN") {

    const addWomen = new Women({
      sellerName: sellerName,
      email: email,
      productName: productName,
      size: size,
      description: description,
      image: image,
      price: price,
      count: count
    });
    addWomen.save(function(err) {
      if (err) {
        return console.log(err);
      } else
        console.log("Inserted succussfully!");
    });
  } else {

    const addMen = new Men({
      sellerName: sellerName,
      email: email,
      productName: productName,
      size: size,
      description: description,
      image: image,
      price: price
    });
    addMen.save(function(err) {
      if (err) {
        return console.log(err);
      } else
        console.log("Inserted succussfully!");
    });
  }

  if (req.isAuthenticated()) {
    res.redirect("/thankyou")
  } else {
    res.redirect("/login");
  }
});

app.post("/register", function(req, res) {

  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/");
      });
    }
  });

});

app.post("/login", function(req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/");
      });
    }
  });

});

app.post("/cart", function(req, res){
  Women.find({count: req.body.return}, function(err, foundWomen) {
    if (err) {
      console.log(err);
    } else {

      if (foundWomen) {

        const addCart = new Cart({
          productName: foundWomen[0].productName,
          size: foundWomen[0].size,
          description: foundWomen[0].description,
          price: foundWomen[0].price,
          count: foundWomen[0].count
        });
        addCart.save(function(err) {
          if (err) {
            return console.log(err);
          } else
            console.log("Inserted to cart succussfully!");
        });

      }
    }
  });

  res.redirect("/women#products");
})

// google auth code
app.get("/auth/google",
  passport.authenticate('google', {
    scope: ["profile"]
  })
);

app.get("/auth/google/dissmiss",
  passport.authenticate('google', {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/");
  }
);

app.listen(process.env.PORT || 3000, function() {
  console.log("Running on port 3000.");
});
