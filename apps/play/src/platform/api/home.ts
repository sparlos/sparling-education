// The home port over the platform's API, through the generated client.
import {
  getHome,
  markKeepsakesSeen,
  markRewardsSeen,
  markSeenInWardrobe,
  placeSticker,
  takeOffSticker,
  wearLook,
} from "@repo/api-client";
import { parseLook } from "@repo/avatar";
import { type HomePort, NotOwned } from "../ports.ts";
import { unexpected } from "./unexpected.ts";

export function apiHome(): HomePort {
  return {
    async current() {
      const res = await getHome();
      if (res.status !== 200) throw unexpected("home", res.status);
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
    async markSeenInWardrobe(items) {
      const res = await markSeenInWardrobe({ rewards: [...items] });
      if (res.status !== 204) throw unexpected("wardrobe seen", res.status);
    },
    async place(sticker, spot) {
      const res = await placeSticker(sticker, spot);
      if (res.status === 400) throw new NotOwned();
      if (res.status !== 200) throw unexpected("place sticker", res.status);
      return res.data;
    },
    async takeOff(sticker) {
      const res = await takeOffSticker(sticker);
      if (res.status !== 204) throw unexpected("take off sticker", res.status);
    },
    async markKeepsakesSeen(games) {
      const res = await markKeepsakesSeen({ games: [...games] });
      if (res.status !== 204) throw unexpected("keepsakes seen", res.status);
    },
  };
}
