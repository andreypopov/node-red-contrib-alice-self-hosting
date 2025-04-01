import {NodeAPI} from 'node-red';
import {LRUCache} from 'lru-cache';

module.exports = (RED: NodeAPI) => {
  const credentialsValidator = function (credentials: any) {
    if (!credentials?.skill_id) {
      throw new Error('Parameter `Skill Id` is required');
    }
    if (!credentials?.oauth_token) {
      throw new Error('Parameter `OAuth Token` is required');
    }
    if (!credentials?.path) {
      throw new Error('Parameter `Path` is required');
    }
  };

  // use cache
  const cache: LRUCache<string, any> = new LRUCache({max: 10_000});

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const webhook = require('../lib/webhook')(RED);

  RED.nodes.registerType(
    'alice-sh-service',
    function (this: any, config: any) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;
      self.config = config;

      RED.nodes.createNode(this, config);
      // vars
      self.init = false;
      self.cache = cache;

      try {
        credentialsValidator(self.credentials);
        webhook.publish(self);
        self.init = true;
      } catch (error: any) {
        self.error(error);
        return;
      }

      self.on('close', function (removed: any, done: () => any) {
        if (self.cache) self.cache.clear();
        webhook.unpublish(self);
        self.init = false;
        done();
      });
    },
    {
      credentials: {
        skill_id: {type: 'text'},
        oauth_token: {type: 'text'},
        path: {type: 'text'}
      }
    }
  );
};
