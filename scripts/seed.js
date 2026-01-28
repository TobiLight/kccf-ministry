import { db } from "../src/db";
import { users } from "../drizzle/schema";
const usersData = [
    { id: "2cd5fecb-eee6-4cd1-8639-1f634b900a3b", name: "Loren" },
    { id: "ce642ef6-6367-406e-82ea-b0236361440f", name: "Alex" },
    { id: "288bc717-a551-4a91-8d9d-444d13addb68", name: "Dolly" },
    { id: "9689b595-abe1-4589-838c-1958aae53a94", name: "Bobby" },
    { id: "6ef2bf51-f656-49ac-843f-5954a6f2a00b", name: "Sofia" },
];

const seed = async () => {
    await db.transaction(async (tx) => {
        await tx.delete(users);
        await tx.insert(users).values(usersData);
    });
};
try {
    seed().then(() => {
        console.log("Database seeded");
        process.exit(0);
    }).catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
catch (error) {
    console.error(error);
    process.exit(1);
}
