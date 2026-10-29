// The locker port over Kindling's API, through the generated client.
import { getLocker, markRewardsSeen, wearLook } from "@repo/api-client";
import { parseLook } from "@repo/avatar";
import { type LockerPort, NotOwned } from "../ports.ts";
import { unexpected } from "./unexpected.ts";

export function apiLocker(): LockerPort {
  return {
    async current() {
      const res = await getLocker();
      if (res.status !== 200) throw unexpected("locker", res.status);
      return res.data;
    },
    async wear(look) {
      const res = await wearLook(look);
      if (res.status === 400) throw new NotOwned();
      if (res.status !== 200) throw unexpected("wear", res.status);
      const worn = parseLook(res.data);
      if (!worn) throw new Error("[play] The API answered wear with no look");
      return worn;
    },
    async markSeen(rewards) {
      const res = await markRewardsSeen({ rewards: [...rewards] });
      if (res.status !== 204) throw unexpected("seen", res.status);
    },
  };
}
