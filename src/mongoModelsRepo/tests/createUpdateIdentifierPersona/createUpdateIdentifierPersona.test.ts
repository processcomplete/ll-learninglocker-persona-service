import assertError from 'jscommons/dist/tests/utils/assertError';
import {
  type Db,
  type Filter,
  type FindOneAndUpdateOptions,
  type ModifyResult,
  MongoClient,
  ObjectId,
  type UpdateFilter,
} from 'mongodb';

import config from '../../../config';
import Locked from '../../../errors/Locked';
import repoFactory from '../../../repoFactory';
import type ServiceConfig from '../../../service/Config';
import { TEST_IFI, TEST_ORGANISATION } from '../../../tests/utils/values';
import createUpdateIdentifierPersona from '../../createUpdateIdentifierPersona';

describe('createUpdateIdentifierPersona mongo', () => {
  // Only test mongo repo
  /* istanbul ignore next */
  if (config.repoFactory.modelsRepoName !== 'mongo') {
    return;
  }

  let serviceConfig: ServiceConfig;
  beforeEach(async () => {
    const repoFacade = repoFactory();
    serviceConfig = { repo: repoFacade };
    await serviceConfig.repo.clearRepo();
  });

  const generateMockDb = async () => {
    const db = (await MongoClient.connect(
      config.mongoModelsRepo.url,
      config.mongoModelsRepo.options,
    )).db();

    return {
      ...db,
      collection: (name: string) => {
        /* istanbul ignore next */
        if (name !== 'personaIdentifiers') {
          return db.collection(name);
        }
        const collection2 = db.collection(name);

        return Object.setPrototypeOf({
          ...collection2,
          findOneAndUpdate: async (
            filter: Filter<any>,
            update: UpdateFilter<any>,
            options: FindOneAndUpdateOptions,
          ): Promise<ModifyResult> => {
            const result = await collection2.findOneAndUpdate(filter, update, {
              ...options,
              includeResultMetadata: true, // Ensure we get the old format for testing
            });

            // Simulate a race condition where another process created the identifier
            // but our findOneAndUpdate doesn't return it (simulating timing issue)
            return {
              lastErrorObject: {
                updatedExisting: true, // Someone else created it
                n: 1,
                upserted: undefined,
              },
              value: {
                _id: new ObjectId(),
                ifi: filter.ifi || {},
                organisation: new ObjectId(),
                locked: true,
                lockedAt: new Date(),
                // persona is undefined (not set yet)
              },
              ok: 1,
            };
          },
        }, Object.getPrototypeOf(collection2));
      },
    } as Db;
  };

  it('Should throw locked if was not created', async () => {
    const resultPromise = createUpdateIdentifierPersona({ db: generateMockDb() })({
      ifi: TEST_IFI,
      organisation: TEST_ORGANISATION,
      personaName: 'Dave 6',
    });

    await assertError(Locked, resultPromise);
  });
});
