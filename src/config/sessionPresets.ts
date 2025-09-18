export interface FocusIntent {
  id: string
  name: string
  description: string
  recommendedMinutes: number
  suggestedBreak: number
  affirmation: string
}

export const FOCUS_INTENTS: FocusIntent[] = [
  {
    id: 'deep',
    name: '深度工作',
    description: '無通知、無打擾的沉浸式專注，適合長篇寫作與研究。',
    recommendedMinutes: 50,
    suggestedBreak: 10,
    affirmation: '你已經營造了絕對安靜的空間。把握這段持續向前。',
  },
  {
    id: 'creative',
    name: '靈感火花',
    description: '專為需要創造力的任務設計，節奏稍短但更有彈性。',
    recommendedMinutes: 35,
    suggestedBreak: 7,
    affirmation: '偶爾換個角度，靈感就在呼吸之間。',
  },
  {
    id: 'sprint',
    name: '番茄衝刺',
    description: '經典番茄鐘節奏，保持高能量並適時休息。',
    recommendedMinutes: 25,
    suggestedBreak: 5,
    affirmation: '一小段高強度專注，就能推動整個下午。',
  },
  {
    id: 'gentle',
    name: '柔和專注',
    description: '給自己一點溫柔，在穩定節奏中慢慢前進。',
    recommendedMinutes: 40,
    suggestedBreak: 8,
    affirmation: '放慢一點也沒關係，穩穩抵達就好。',
  },
]

export const BREAK_OPTIONS = [5, 7, 10, 12, 15]

export interface AmbientTrack {
  id: string
  label: string
  description: string
  url: string
}

export const AMBIENT_TRACKS: AmbientTrack[] = [
  {
    id: 'chillsynth',
    label: 'Chillsynth 柔波',
    description: '柔和的合成器紋理，營造溫暖但不打擾的背景。',
    url: 'https://stream.nightride.fm/chillsynth.mp3',
  },
  {
    id: 'datawave',
    label: 'Datawave 流線',
    description: '帶點律動的電子波形，讓專注維持平穩推進。',
    url: 'https://stream.nightride.fm/datawave.mp3',
  },
  {
    id: 'nightride',
    label: 'Nightride Ambient',
    description: '官方 Ambient 混音，層次豐富且耐聽。',
    url: 'https://stream.nightride.fm/nightride.mp3',
  },
  {
    id: 'groove',
    label: 'Groove Salad',
    description: 'SomaFM 精選，下班後的輕盈專注。',
    url: 'https://ice1.somafm.com/groovesalad-128-mp3',
  },
]

export function findIntentById(id?: string | null) {
  if (!id) return FOCUS_INTENTS[0]
  return FOCUS_INTENTS.find((item) => item.id === id) ?? FOCUS_INTENTS[0]
}

export function findAmbientById(id?: string | null) {
  if (!id) return AMBIENT_TRACKS[0]
  return AMBIENT_TRACKS.find((item) => item.id === id) ?? AMBIENT_TRACKS[0]
}
