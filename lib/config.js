import winston from "winston";
import convict from "convict";

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.simple()
  )
});

const SCHEMA = {
  port: {
    doc: "The port to bind.",
    format: "port",
    default: 8081,
    env: "PORT",
    arg: "port"
  },
  shutdownTimeout: {
    doc: "Grace period after SIGINT/SIGTERM.",
    format: "duration",
    default: 1000,
    env: "SHUTDOWN_TIMEOUT"
  },
  basePath: {
    doc: "Base path for API endpoints",
    format: "String",
    default: "/api/v3/",
    env: "BASE_PATH"
  },
  orgchartService: {
    doc: "orgchart service with port.",
    format: "String",
    default: "http://localhost:8888/",
    env: "ORGCHART_SERVICE"
  },
  searchService: {
    doc: "search service with port.",
    format: "String",
    default: "http://localhost:8889/",
    env: "SEARCH_SERVICE"
  }
};

function load(configFile) {
  const CONFIG = convict(SCHEMA);
  try {
    if (configFile) {
      CONFIG.loadFile(configFile);
    }
    CONFIG.validate({ allowed: "strict" });
    return CONFIG.getProperties();
  } catch (e) {
    throw new Error(`error reading config: ${e}`);
  }
}

export { load, logger, SCHEMA };
