import type Config from './Config';
import {
  PERSONA_ATTRIBUTES_COLLECTION,
  PERSONA_IDENTIFIERS_COLLECTION,
  PERSONAS_COLLECTION,
} from './utils/constants/collections';

export default (config: Config) => {
  return async () => {
    const db = await config.db;
    const personasCollection = db.collection(PERSONAS_COLLECTION);
    const attributesCollection = db.collection(PERSONA_ATTRIBUTES_COLLECTION);
    const identCollection = db.collection(PERSONA_IDENTIFIERS_COLLECTION);

    await personasCollection.createIndex({
      organisation: 1,
    });

    await identCollection.createIndex({
      organisation: 1,
      persona: 1,
    });

    await identCollection.createIndex({
      organisation: 1,
      ifi: 1,
    }, { unique: true });

    await attributesCollection.createIndex({
      organisation: 1,
      personaId: 1,
      key: 1,
    });
  };
};
