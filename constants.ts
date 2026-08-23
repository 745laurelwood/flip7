// Bot names, chat limits and the z-index scale come from the shared skin.
export {
  BOT_NAMES, pickBotNames,
  MAX_LOG_ENTRIES, CHAT_MAX_LEN, CHAT_MAX_HISTORY,
  PEER_ID_DISPLAY_LENGTH, EMPTY_SLOT_NAME,
  Z_CARD_SELECTED, Z_HUD, Z_ACTION_BAR, Z_TURN_BADGE, Z_OVERLAY, Z_MODAL,
} from '@laurelwood/card-class';

// ============================================================
// UI timing (ms)
// ============================================================
// Flip 7 is a fast game and the appeal is the rhythm of the flips, so these
// are shorter than the trick-taking games'. A Flip Three has to read as three
// separate cards rather than one blur, which is what FLIP_THREE_STEP_MS is.

export const AI_TURN_DELAY_MS = 750;
export const AI_AIM_DELAY_MS = 650;
export const FLIP_THREE_STEP_MS = 600;
export const ROUND_END_DELAY_MS = 900;

/** How long the table holds up a moment it stops to show, like a save. */
export const MOMENT_SHOW_MS = 2600;
