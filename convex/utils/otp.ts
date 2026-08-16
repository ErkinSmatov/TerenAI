import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

export default function generateNumericToken(length = 4): string {
  const random: RandomReader = {
    read(bytes) {
      crypto.getRandomValues(bytes);
    },
  };

  return generateRandomString(random, "0123456789", length);
}
