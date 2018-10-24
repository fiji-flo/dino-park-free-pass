import { buildSchema } from "graphql";
import graphqlHTTP from "express-graphql";
import axios from "axios";

import { logger } from "./config";

// The GraphQL schema
const schema = buildSchema(`
  type Values {
    values: [String]
  }

  type Tuples {
    values: [String]
  }

  type StringValue {
    value: String
  }

  type BooleanValue {
    value: Boolean
  }

  type RelatedProfile {
    userId: String
    firstName: String
    lastName: String
    picture: String
    title: String
    funTitle: String
    location: String
  }

  type Profile {
    userId: StringValue
    loginMethod: StringValue
    active: BooleanValue
    lastModified: StringValue
    created: StringValue
    usernames: Values
    firstName: StringValue
    lastName: StringValue
    primaryEmail: StringValue
    "identities: Identities"
    sshPublicKeys: Tuples
    pgpPublicKeys: Tuples
#    accessInformation: AccessInformation
    funTitle: StringValue
    description: StringValue
    locationPreference: StringValue
    officeLocation: StringValue
    timeZone: StringValue
    preferredLanguage: Values
    tags: Values
    pronouns: StringValue
    picture: StringValue
    uris: Values
    phoneNumbers: Values
    alternativeName: StringValue
    manager: RelatedProfile
    directs: [RelatedProfile]
    employeeId: StringValue
    businessTitle: StringValue
    isManager: BooleanValue
    isDirectorOrAbove: BooleanValue
    entity: StringValue
    team: StringValue
    costCenter: StringValue
    workerType: StringValue
    primaryWorkEmail: StringValue
    wprDeskNumber: StringValue
    locationDescription: StringValue
    publicEmailAddresses: Values
  }

  type Query {
    profile(userId: String!): Profile
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

function mapProfile(o, related) {
  const { manager, directs } = mapRelated(related);
  logger.info(`manager: ${JSON.stringify(manager)}`);
  const profile = {};
  for (const f of fields) {
    const snake = f.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
    if (f === "pgpPublicKeys" || f === "sshPublicKeys") {
      profile[f] = {
        values:
          o[snake] !== null && o[snake].values !== null
            ? Object.entries(o[snake].values).map(
              ([k, v]) => `(u'${k}',u'${v}'`
            )
            : null
      };
    } else if (f === "manager") {
      profile[f] = manager;
    } else if (f === "directs") {
      profile[f] = directs;
    } else {
      profile[f] = o[snake] || { value: null };
    }
  }
  return profile;
}
const fields = [
  "userId",
  "loginMethod",
  "active",
  "lastModified",
  "created",
  "usernames",
  "firstName",
  "lastName",
  "primaryEmail",
  //    "identities",
  "sshPublicKeys",
  "pgpPublicKeys",
  //    "accessInformation",
  "funTitle",
  "description",
  "locationPreference",
  "officeLocation",
  "timeZone",
  "preferredLanguage",
  "tags",
  "pronouns",
  "picture",
  "uris",
  "phoneNumbers",
  "alternativeName",
  "manager",
  "directs",
  "employeeId",
  "businessTitle",
  "isManager",
  "isDirectorOrAbove",
  "entity",
  "team",
  "costCenter",
  "workerType",
  "primaryWorkEmail",
  "wprDeskNumber",
  "locationDescription",
  "publicEmailAddresses"
];
// A map of functions which return data for the schema.
function root(cfg) {
  return {
    profile: async ({ userId }) => {
      logger.info(`fetching profile ${userId}`);
      try {
        const response = await axios.get(
          `${cfg.searchService}search/get/private/${userId}`
        );
        const related = await axios.get(
          `${cfg.orgchartService}orgchart/related/${userId}`
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

export { graphqlProxy as default };
