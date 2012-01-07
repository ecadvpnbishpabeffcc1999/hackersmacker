(function() {
  var USER_FOED_BY, USER_FOES_WITH, USER_FRIENDED_BY, USER_FRIENDS_WITH, async, client, redis;

  redis = require('redis');

  client = redis.createClient();

  async = require('async');

  USER_FRIENDS_WITH = "F";

  USER_FRIENDED_BY = "f";

  USER_FOES_WITH = "X";

  USER_FOED_BY = "x";

  module.exports = {
    saveRelationship: function(originalUsername, relationship, username) {
      var foedBy, foesWith, friendedBy, friendsWith;
      console.log(" ---> [" + originalUsername + "] Adding " + username + " as a " + relationship + ".");
      friendsWith = "G:" + originalUsername + ":" + USER_FRIENDS_WITH;
      friendedBy = "G:" + username + ":" + USER_FRIENDED_BY;
      foesWith = "G:" + originalUsername + ":" + USER_FOES_WITH;
      foedBy = "G:" + username + ":" + USER_FOED_BY;
      if (relationship === 'friend') {
        client.sadd(friendsWith, username);
        client.sadd(friendedBy, originalUsername);
        client.srem(foesWith, username);
        return client.srem(foedBy, originalUsername);
      } else if (relationship === 'foe') {
        client.srem(friendsWith, username);
        client.srem(friendedBy, originalUsername);
        client.sadd(foesWith, username);
        return client.sadd(foedBy, originalUsername);
      } else if (relationship === 'neutral') {
        client.srem(friendsWith, username);
        client.srem(friendedBy, originalUsername);
        client.srem(foesWith, username);
        return client.srem(foedBy, originalUsername);
      }
    },
    findRelationships: function(originalUsername, usernames, callback) {
      var graph, multi1, multi2;
      multi1 = client.multi();
      multi2 = client.multi();
      graph = {
        friends: [],
        foes: [],
        foaf_friends: [],
        foaf_foes: []
      };
      return client.sadd("T:" + originalUsername + ":onpage", usernames, function(e, m) {
        multi1.sinter("G:" + originalUsername + ":" + USER_FRIENDS_WITH, "T:" + originalUsername + ":onpage", function(e, m) {
          if (m) return graph.friends = graph.friends.concat(m);
        });
        multi1.sinter("G:" + originalUsername + ":" + USER_FOES_WITH, "T:" + originalUsername + ":onpage", function(e, m) {
          if (m) return graph.foes = graph.foes.concat(m);
        });
        multi1.smembers("G:" + originalUsername + ":" + USER_FRIENDS_WITH, function(e, m) {
          var friend, _fn, _i, _len;
          _fn = function(friend) {
            multi2.sinter("G:" + friend + ":" + USER_FRIENDS_WITH, "T:" + originalUsername + ":onpage", function(e, m) {
              if (m) return graph.foaf_friends = graph.foaf_friends.concat(m);
            });
            return multi2.sinter("G:" + friend + ":" + USER_FOES_WITH, "T:" + originalUsername + ":onpage", function(e, m) {
              if (m) return graph.foaf_foes = graph.foaf_foes.concat(m);
            });
          };
          for (_i = 0, _len = m.length; _i < _len; _i++) {
            friend = m[_i];
            _fn(friend);
          }
          return multi2.exec(function() {
            return callback(graph);
          });
        });
        return multi1.exec();
      });
    }
  };

}).call(this);
