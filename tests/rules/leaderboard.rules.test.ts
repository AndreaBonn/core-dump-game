import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const PROJECT_ID = 'demo-core-dump';
const ALICE = 'alice';
const BOB = 'bob';

/** A score document that satisfies every rule, for the given owner. */
function validScore(userId: string, score: number) {
  return {
    userId,
    displayName: 'neo',
    score,
    levelReached: 3,
    timestamp: serverTimestamp(),
  };
}

function scorePath(mode: string, uid: string): string {
  return `leaderboards/${mode}/scores/${uid}`;
}

let testEnv: RulesTestEnvironment;

function asAlice(): Firestore {
  return testEnv.authenticatedContext(ALICE).firestore() as unknown as Firestore;
}

beforeAll(async () => {
  // Set by `firebase emulators:exec`; the fallback matches firebase.json.
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8089').split(':');
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host,
      port: Number(port),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

/** Seed a stored best without going through the rules. */
async function seedScore(mode: string, uid: string, score: number): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as unknown as Firestore;
    await setDoc(doc(db, scorePath(mode, uid)), {
      ...validScore(uid, score),
      timestamp: serverTimestamp(),
    });
  });
}

describe('leaderboard rules: reading', () => {
  it('lets anyone read a board', async () => {
    await seedScore('campaign', ALICE, 100);
    const anonymous = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;

    await assertSucceeds(getDoc(doc(anonymous, scorePath('campaign', ALICE))));
  });
});

describe('leaderboard rules: creating', () => {
  it('accepts a valid first score from its owner', async () => {
    await assertSucceeds(
      setDoc(doc(asAlice(), scorePath('campaign', ALICE)), validScore(ALICE, 500)),
    );
  });

  it('rejects a score written into another player document', async () => {
    await assertFails(setDoc(doc(asAlice(), scorePath('campaign', BOB)), validScore(BOB, 500)));
  });

  it('rejects a userId that does not match the document id', async () => {
    await assertFails(setDoc(doc(asAlice(), scorePath('campaign', ALICE)), validScore(BOB, 500)));
  });

  it('rejects an unauthenticated write', async () => {
    const anonymous = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;

    await assertFails(setDoc(doc(anonymous, scorePath('campaign', ALICE)), validScore(ALICE, 500)));
  });

  it('rejects a score outside the accepted range', async () => {
    await assertFails(
      setDoc(doc(asAlice(), scorePath('campaign', ALICE)), validScore(ALICE, 1_000_000)),
    );
    await assertFails(setDoc(doc(asAlice(), scorePath('campaign', ALICE)), validScore(ALICE, -1)));
  });

  it('rejects an empty or over-long display name', async () => {
    await assertFails(
      setDoc(doc(asAlice(), scorePath('campaign', ALICE)), {
        ...validScore(ALICE, 10),
        displayName: '',
      }),
    );
    await assertFails(
      setDoc(doc(asAlice(), scorePath('campaign', ALICE)), {
        ...validScore(ALICE, 10),
        displayName: 'x'.repeat(25),
      }),
    );
  });

  it('rejects extra fields', async () => {
    await assertFails(
      setDoc(doc(asAlice(), scorePath('campaign', ALICE)), {
        ...validScore(ALICE, 10),
        isAdmin: true,
      }),
    );
  });

  it('rejects a client-chosen timestamp', async () => {
    await assertFails(
      setDoc(doc(asAlice(), scorePath('campaign', ALICE)), {
        ...validScore(ALICE, 10),
        timestamp: new Date(2030, 0, 1),
      }),
    );
  });

  it('rejects a board that is not one of the three modes', async () => {
    await assertFails(setDoc(doc(asAlice(), scorePath('speedrun', ALICE)), validScore(ALICE, 500)));
  });
});

describe('leaderboard rules: updating', () => {
  it('accepts an update that raises the score', async () => {
    await seedScore('campaign', ALICE, 100);

    await assertSucceeds(
      setDoc(doc(asAlice(), scorePath('campaign', ALICE)), validScore(ALICE, 300)),
    );
  });

  it('rejects an update that lowers the score', async () => {
    await seedScore('campaign', ALICE, 500);

    await assertFails(setDoc(doc(asAlice(), scorePath('campaign', ALICE)), validScore(ALICE, 300)));
  });

  it('rejects an update that repeats the same score', async () => {
    await seedScore('campaign', ALICE, 300);

    await assertFails(setDoc(doc(asAlice(), scorePath('campaign', ALICE)), validScore(ALICE, 300)));
  });

  it('re-validates the whole document, not just the score', async () => {
    await seedScore('campaign', ALICE, 100);

    // A higher score, but with a level outside the accepted range: the bounds
    // hold on update too, otherwise creation-time validation could be bypassed.
    await assertFails(
      setDoc(doc(asAlice(), scorePath('campaign', ALICE)), {
        ...validScore(ALICE, 300),
        levelReached: 999,
      }),
    );
  });

  it('rejects an update that injects an extra field', async () => {
    await seedScore('campaign', ALICE, 100);

    await assertFails(
      setDoc(doc(asAlice(), scorePath('campaign', ALICE)), {
        ...validScore(ALICE, 300),
        isAdmin: true,
      }),
    );
  });

  it('rejects an update to another player score', async () => {
    await seedScore('campaign', BOB, 100);

    await assertFails(setDoc(doc(asAlice(), scorePath('campaign', BOB)), validScore(BOB, 300)));
  });
});

describe('leaderboard rules: deleting', () => {
  it('lets a player erase their own score', async () => {
    await seedScore('endless', ALICE, 100);

    await assertSucceeds(deleteDoc(doc(asAlice(), scorePath('endless', ALICE))));
  });

  it('does not let a player erase someone else score', async () => {
    await seedScore('endless', BOB, 100);

    await assertFails(deleteDoc(doc(asAlice(), scorePath('endless', BOB))));
  });
});

describe('leaderboard rules: the three boards are separate', () => {
  it('keeps a score in the mode it was written to', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), scorePath('daily', ALICE)), validScore(ALICE, 700)));

    const campaignEntry = await getDoc(doc(asAlice(), scorePath('campaign', ALICE)));
    expect(campaignEntry.exists()).toBe(false);
  });
});
