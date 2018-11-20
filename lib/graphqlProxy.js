import { buildSchema } from "graphql";
import graphqlHTTP from "express-graphql";
import axios from "axios";

import { logger } from "./config";

// The GraphQL schema
const schema = buildSchema(`
  scalar KeyValue

  type RelatedProfile {
    userId: String
    firstName: String
    lastName: String
    picture: String
    title: String
    funTitle: String
    location: String
    username: String
  }

  type AccessInformation {
    mozilliansorg: KeyValue
  }

  type StaffInformation {
    staff: String
    title: String
    team: String
    costCenter: String
    workerType: String
    primaryWorkEmail: String
    wprDeskNumber: String
    officeLocation: String
  }

  type Profile {
    dinoId: String
    username: String
    loginMethod: String
    active: Boolean
    lastModified: String
    created: String
    usernames: KeyValue
    firstName: String
    lastName: String
    primaryEmail: String
    "identities: Identities"
    sshPublicKeys: KeyValue
    pgpPublicKeys: KeyValue
    accessInformation: AccessInformation
    funTitle: String
    description: String
    location: String
    timezone: String
    languages: [String]
    tags: [String]
    pronouns: String
    picture: String
    uris: KeyValue
    phoneNumbers: KeyValue
    alternativeName: String
    manager: RelatedProfile
    directs: [RelatedProfile]
    staffInformation: StaffInformation
  }

  type Query {
    profile(username: String): Profile
  }
`);

function mapRelatedProfile(o) {
  if (!o) {
    return null;
  }
  const related = {};
  for (const [k, v] of Object.entries(o)) {
    const camel = k.replace(/_[a-z]/g, m => `${m[1].toUpperCase()}`);
    related[camel] = v;
  }
  return related;
}

function mapRelated(o) {
  const manager = mapRelatedProfile(o.manager);
  const directs = (o.directs || []).map(mapRelatedProfile);
  return {
    manager,
    directs
  };
}

const VALUES = new Set([
  "pgpPublicKeys",
  "sshPublicKeys",
  "phoneNumbers",
  "usernames",
  "uris"
]);

function snakeCase(s) {
  return s.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
}

function camelCase(s) {
  return s.replace(/(\_\w)/g, m => m[1].toUpperCase());
}

function mapProfile(o, related) {
  logger.info("mapping…");
  const { manager, directs } = mapRelated(related);
  const profile = {};
  for (const f of fields) {
    const snake = snakeCase(f);
    if (VALUES.has(f)) {
      const values = (o[snake] && o[snake].values) || null;
      profile[f] = values;
    } else if (f === "staffInformation") {
      profile[f] = ObjectFromEntries(
        Object.entries(o[snake]).map(([k, v]) => [
          camelCase(k),
          v === null ? null : v.value
        ])
      );
    } else if (f === "accessInformation") {
      logger.info(`access: ${JSON.stringify(o[snake])}`);
      profile[f] =
        o[snake].mozilliansorg && o[snake].mozilliansorg.values !== null
          ? {
              mozilliansorg: o[snake].mozilliansorg.values
            }
          : { mozilliansorg: null };
    } else if (snake in o && o[snake] !== null && o[snake].values) {
      profile[f] = o[snake].values;
    } else if (f === "manager") {
      profile[f] = manager;
    } else if (f === "directs") {
      profile[f] = directs;
    } else {
      profile[f] = o[snake] === null ? null : o[snake].value;
    }
  }
  profile.username = o.usernames.values.mozilliansorg;
  profile.dinoId = o.identities.dinopark_id.value;
  return profile;
}
const fields = [
  "loginMethod",
  "active",
  "lastModified",
  "created",
  "usernames",
  "firstName",
  "lastName",
  "primaryEmail",
  // "identities",
  "sshPublicKeys",
  "pgpPublicKeys",
  "accessInformation",
  "funTitle",
  "description",
  "location",
  "timezone",
  "languages",
  "tags",
  "pronouns",
  "picture",
  "uris",
  "phoneNumbers",
  "alternativeName",
  "manager",
  "directs",
  "staffInformation"
];
// A map of functions which return data for the schema.
function root(cfg) {
  return {
    profile: async ({ username }) => {
      const _username = username || "fiji";
      logger.info(`fetching profile ${_username}`);
      try {
        const response = await axios.get(
          `${cfg.searchService}search/get/private/${_username}`
        );
        const related = await axios.get(
          `${cfg.orgchartService}orgchart/related/${_username}`
        );
        return mapProfile(response.data, related.data);
      } catch (e) {
        logger.error(`got ${e}`);
        return null;
      }
    }
  };
}

function graphqlProxy(cfg) {
  return graphqlHTTP({
    schema: schema,
    rootValue: root(cfg)
  });
}

function ObjectFromEntries(iter) {
  const obj = {};

  for (const pair of iter) {
    if (Object(pair) !== pair) {
      throw new TypeError("iterable for fromEntries should yield objects");
    }

    // Consistency with Map: contract is that entry has "0" and "1" keys, not
    // that it is an array or iterable.

    const { "0": key, "1": val } = pair;

    Object.defineProperty(obj, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: val
    });
  }

  return obj;
}

export { graphqlProxy as default };
