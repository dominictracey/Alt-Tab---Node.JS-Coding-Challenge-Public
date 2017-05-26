'use strict';

let express = require('express');
let app = express();
var mongoose = require('mongoose');
var schema = require('./schema');
var bodyParser = require('body-parser')
var hasher = require('password-hash')

app.use(bodyParser.json({
  extended: true
}));

mongoose.connect('mongodb://localhost/test');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("mongo ready")
});

var User = mongoose.model('User', schema.getSchema());


/*
** Register - sign up a new user
**    - all fields must be present (name, email, password)
**    - email must not be in use
*/
app.use('/api/register', function(req, res) {

  var name = req.body.name,
  email = req.body.email,
  password = req.body.password;
  if (!name || !email || !password) {
    res.status(400).json("all fields not present'")
    return
  }

  // check if user exists
  let error = false
  User.find({ email: email }, function(err, users) {
    if (users.length > 0) {
      res.status(400).json("User already exists")
    } else {
      var time = new Date()
      var token = hasher.generate(time.toString())

      var user = new User({ name: name, email: email, passwordHash: hasher.generate(password), currToken: token, tokenGenerated: time });
      user.save(function (err, user) {
        if (err) {
          console.error(err);
          res.status(500).send(err)
        } else {
          res.status(201).json({token:  user.currToken})
        }
      });
    }
  });
});

/*
** Login - checks the password (clear text) provided against the stored hash and updates the user's token and returns it
*/
app.use('/api/login', function(req, res) {
  const email = req.body.email,
  password = req.body.password;

  User.find({ email: email }, function(err, users) {
    if (users.length > 0) {
      if (hasher.verify(password,users[0].passwordHash)) {
        //success
        var time = new Date()
        var token = hasher.generate(time.toString())
        users[0].currToken = token
        users[0].tokenGenerated = time
        users[0].save(function (err, user) {
          if (err) {
            console.error(err);
            res.status(500).send(err)
          } else {
            res.status(200).json({token:  user.currToken})
          }
        })
      } else {
        // bad password
        res.status(401).send('Bad userid or password')
      }
    } else {
      // email not found
      res.status(401).send('Bad userid or password')
    }
  });
});

/*
** logout - clears the users token in the db
**
**    TODO - needs unit test
*/
app.use('/api/logout', function(req, res) {
  console.log('logout')
  const token = req.get('Authorization')
  if (!token) {
    res.status(401).send('Not logged in')
  }

  token = token.split(' ')[1]

  User.find({ currToken: token }, function(err, users) {
    if (users.length > 0) {
        users[0].currToken = ''
        users[0].tokenGenerated = ''
        users[0].save(function (err, user) {
          if (err) {
            console.error(err);
            res.status(500).send(err)
          } else {
            res.status(200).json({token: ''})
          }
        })
      } else {
        // whatever
        res.status(200).json({token: ''})
      }
  });
});

/*
** profile - if the request includes a valid token for the user, return their profile
*/
app.use('/api/profile', function(req, res) {

  var token = req.get('Authorization')

  if (!token) {
    res.status(401).send('Not logged in')
  } else {
    token = token.split(' ')[1]
    User.find({ currToken: token }, function(err, users) {
      if (err) {
        console.error(err);
        res.status(500).send(err)
      } else {
        if (users.length > 0) {
          res.status(200).json(users[0])
        } else {
          // bad token
          res.status(401).send('Not logged in')
        }
      }
    });
  }
});

module.exports = app;
