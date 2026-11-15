/* ---------------------------------------------------------------------------
   One mute state for the whole page.

   The player owns the only <audio> element on a profile. A mute button is just
   a control, so it speaks to the player through this bus instead of mounting a
   second copy of the track and playing it over the top of the first.
   --------------------------------------------------------------------------- */

export type AudioBusState = { muted: boolean; volume: number; playToken: number };

let state: AudioBusState = { muted: false, volume: 0.7, playToken: 0 };
const listeners = new Set<(next: AudioBusState) => void>();

export function audioBusState(): AudioBusState {
  return state;
}

export function setAudioBus(patch: Partial<AudioBusState>): void {
  const next = { ...state, ...patch };
  if (next.muted === state.muted && next.volume === state.volume && next.playToken === state.playToken) {
    return;
  }
  state = next;
  listeners.forEach((listener) => listener(state));
}

export function subscribeAudioBus(listener: (next: AudioBusState) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
