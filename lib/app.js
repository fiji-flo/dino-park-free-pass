import http from "http";
import path from "path";

import express from "express";
import bodyParser from "body-parser";

import { logger } from "./config";
import orgchartProxy from "./orgchartProxy";
import searchProxy from "./searchProxy";
import graphqlProxy from "./graphqlProxy";

class App {
  constructor(cfg) {
    this.port = cfg.port;
    this.basePath = "/api/v3/";
    this.shutdownTimeout = cfg.shutdownTimeout;
    this.app = express();
    this.app.use(bodyParser.json());
  }

  _base(_path) {
    const p = path.join(this.basePath, _path);
    logger.info(`mounting ${p}`);
    return p;
  }

  async init(cfg) {
    this.app.get(this._base("/orgchart*"), orgchartProxy(cfg));
    this.app.get(this._base("/search*"), searchProxy(cfg));
    this.app.post(this._base("/graphql"), graphqlProxy(cfg));
  }

  run() {
    this.server = http.createServer(this.app);
    return this.server.listen(this.port);
  }

  stop() {
    let timer;
    const killer = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("timed out closing http server")),
        this.shutdownTimeout
      );
    });
    const close = new Promise(resolve =>
      this.server.close(() => {
        clearTimeout(timer);
        resolve();
      })
    );
    return Promise.race([close, killer]);
  }
}

export { App as default };
