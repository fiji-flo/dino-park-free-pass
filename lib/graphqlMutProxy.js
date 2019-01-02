import { buildSchema } from "graphql";
import graphqlHTTP from "express-graphql";
import axios from "axios";

import { logger } from "./config";

const FIELDS = [
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
  "staffInformation"
];

const REVERSE_FIELDS = [...FIELDS, "username"];

// The GraphQL schema
const schema = buildSchema(
  `
  scalar KeyValue
  scalar Display

  type DisplayBoolean {
    value: Boolean
    display: Display
  }

  type DisplayString {
    value: String
    display: Display
  }

  type DisplayStringList {
    values: [String]
    display: Display
  }

  type DisplayKeyValue {
    values: KeyValue
    display: Display
  }

  type AccessInformation {
    mozilliansorg: DisplayKeyValue
  }

  type StaffInformation {
    staff: DisplayBoolean
    title: DisplayString
    team: DisplayString
    costCenter: DisplayString
    workerType: DisplayString
    primaryWorkEmail: DisplayString
    wprDeskNumber: DisplayString
    officeLocation: DisplayString
  }

  type DisplayProfile {
    dinoId: DisplayString
    username: DisplayString
    loginMethod: DisplayString
    active: DisplayBoolean
    lastModified: DisplayString
    created: DisplayString
    usernames: DisplayKeyValue
    firstName: DisplayString
    lastName: DisplayString
    primaryEmail: DisplayString
    "identities: Identities"
    sshPublicKeys: DisplayKeyValue
    pgpPublicKeys: DisplayKeyValue
    accessInformation: AccessInformation
    funTitle: DisplayString
    description: DisplayString
    location: DisplayString
    timezone: DisplayString
    languages: DisplayStringList
    tags: DisplayStringList
    pronouns: DisplayString
    picture: DisplayString
    uris: DisplayKeyValue
    phoneNumbers: DisplayKeyValue
    alternativeName: DisplayString
    staffInformation: StaffInformation
  }

  type Query {
    displayProfile(username: String): DisplayProfile
  }

  input KeyValueInput {
    key: String
    value: String
  }

  input DisplayBooleanInput {
    value: Boolean
    display: String
  }

  input DisplayStringInput {
    value: String
    display: String
  }

  input DisplayStringListInput {
    values: [String]
    display: String
  }

  input DisplayKeyValueListInput {
    values: [KeyValue]
    display: String
  }

  input AccessInformationInput {
    mozilliansorg: DisplayKeyValueListInput
  }

  input StaffInformationInput {
    staff: DisplayBooleanInput
    title: DisplayStringInput
    team: DisplayStringInput
    costCenter: DisplayStringInput
    workerType: DisplayStringInput
    primaryWorkEmail: DisplayStringInput
    wprDeskNumber: DisplayStringInput
    officeLocation: DisplayStringInput
  }

  input DisplayProfileInput {
    dinoId: DisplayStringInput
    username: DisplayStringInput
    loginMethod: DisplayStringInput
    active: DisplayBooleanInput
    lastModified: DisplayStringInput
    created: DisplayStringInput
    usernames: DisplayKeyValueListInput
    firstName: DisplayStringInput
    lastName: DisplayStringInput
    primaryEmail: DisplayStringInput
    sshPublicKeys: DisplayKeyValueListInput
    pgpPublicKeys: DisplayKeyValueListInput
    accessInformation: AccessInformationInput
    funTitle: DisplayStringInput
    description: DisplayStringInput
    location: DisplayStringInput
    timezone: DisplayStringInput
    languages: DisplayStringListInput
    tags: DisplayStringListInput
    pronouns: DisplayStringInput
    picture: DisplayStringInput
    uris: DisplayKeyValueListInput
    phoneNumbers: DisplayKeyValueListInput
    alternativeName: DisplayStringInput
    staffInformation: StaffInformationInput
  }

  type Mutation {
    updateProfile(username: String, update: DisplayProfileInput): DisplayProfile
  }

`,
  { Display: x => x.toUpperCase() }
);

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

function mapProfile(o) {
  logger.info("mapping…");
  const profile = {};
  for (const f of FIELDS) {
    const snake = snakeCase(f);
    const field = o[snake];
    if (!field) {
      continue;
    }
    const display = field.metadata && field.metadata.display;
    if (VALUES.has(f)) {
      const values = (field && field.values) || null;
      profile[f] = { values: field.values, display };
    } else if (f === "staffInformation") {
      profile[f] = ObjectFromEntries(
        Object.entries(field).map(([k, v]) => [
          camelCase(k),
          {
            value: v === null ? null : v.value,
            display:
              v === null ? null : (v.metadata && v.metadata.display) || null
          }
        ])
      );
    } else if (f === "accessInformation") {
      profile[f] = {
        mozilliansorg:
          (field.mozilliansorg && field.mozilliansorg.values) || null,
        display:
          (field.mozilliansorg &&
            field.mozilliansorg &&
            field.mozilliansorg.metadata &&
            field.mozilliansorg.metadata.display) ||
          null
      };
    } else if (snake in o && field !== null && field.values) {
      profile[f] = {
        values: field.values,
        display: (field.metadata && field.metadata.display) || null
      };
    } else {
      profile[f] = {
        value: (field && field.value) || null,
        display: (field.metadata && field.metadata.display) || null
      };
    }
  }
  profile.username = {
    value: o.usernames.values.mozilliansorg,
    display: "publlic"
  };
  profile.dinoId = { value: o.identities.dinopark_id.value, display: "public" };
  return profile;
}
function mergeObjects(o, u) {
  console.log(`merging in ${JSON.stringify(u)} → ${JSON.stringify(o)}`);
  if (typeof u === "undefined") {
    return o;
  }
  if (o === null) {
    return u;
  }
  switch (typeof o) {
    case "boolean":
    case "number":
    case "string":
      return u;
  }
  if (Array.isArray(o)) {
    return u;
  } else {
    Object.entries(u).forEach(([k, v]) => {
      o[k] = mergeObjects(o[k], v);
    });
  }
  return o;
}

function reverseProfile(o) {
  const profile = {};
  for (const f of REVERSE_FIELDS) {
    if (!(f in o)) {
      continue;
    }
    logger.info(`mapping ${f}`);
    const snake = snakeCase(f);
    if (VALUES.has(f)) {
      const values = o[f].values || null;
      profile[snake] = { values, metadata: { display: o[f].display } };
    } else if (f === "staffInformation") {
      profile[f] = ObjectFromEntries(
        Object.entries(o[f]).map(([k, v]) => [snakeCase(k), v])
      );
    } else if (f === "accessInformation" && o[f].mozilliansorg) {
      profile[snake] = { mozilliansorg: { values: o[f].mozilliansorg } };
    } else if (f === "username") {
      profile.usernames = {
        values: { mozilliansorg: o[f].value },
        metadata: { display: o[f].display }
      };
    } else {
      profile[snake] = {
        value: o[f].value,
        metadata: { display: o[f].display }
      };
    }
  }
  return profile;
}
async function fetchProfile(cfg, username) {
  const _username = username || "fiji";
  logger.info(`fetching profile ${_username}`);
  try {
    const response = await axios.get(
      `${cfg.searchService}search/get/private/${_username}`
    );
    return mapProfile(response.data);
  } catch (e) {
    logger.error(`got ${e}`);
    return null;
  }
}

async function updateProfile(cfg, username, update) {
  const _username = username || "fiji";
  logger.info(`fetching profile ${_username}`);
  try {
    const response = await axios.get(
      `${cfg.searchService}search/get/private/${_username}`
    );
    logger.info(JSON.stringify(update));
    const rev = reverseProfile(update);
    const merged = mergeObjects(response.data, rev);
    logger.info(`merged: ${JSON.stringify(merged["primary_email"])}`);
    return mapProfile(merged);
  } catch (e) {
    logger.error(`got ${e}`);
    return null;
  }
}

function root(cfg) {
  return {
    displayProfile: async ({ username }) => {
      return fetchProfile(cfg, username);
    },
    updateProfile: async ({ username, update }) => {
      return updateProfile(cfg, username, update);
    }
  };
}

function graphqlMutProxy(cfg) {
  return graphqlHTTP({
    schema: schema,
    rootValue: root(cfg),
    graphiql: true
  });
}

function ObjectFromEntries(iter) {
  const obj = {};

  for (const pair of iter) {
    if (Object(pair) !== pair) {
      throw new TypeError("iterable for fromEntries should yield objects");
    }

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

export { graphqlMutProxy as default };
