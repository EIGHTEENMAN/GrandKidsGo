import { computed } from 'vue'
import { wordStore, getStreak, getMasteredCount, getAccuracy, getCorrectCount, getWrongCount } from '../stores/wordStore'
import { studyStore } from '../stores/studyStore'
import { characterStore } from '../stores/characterStore'

/**
 * 把 wordStore.dailyStats 转成 StudyCalendar 期望的格式
 */
export function useLearningData() {
  const dailyLogs = computed(() => {
    const logs: { date: string; subjects: Record<string, { items: number; minutes: number }> }[] = []
    for (const [date, stat] of Object.entries(wordStore.dailyStats)) {
      if (stat.words > 0) {
        logs.push({
          date,
          subjects: {
            english: { items: stat.words, minutes: 0 }
          }
        })
      }
    }
    return logs.sort((a, b) => a.date.localeCompare(b.date))
  })

  const streak = computed(() => getStreak())

  const overview = computed(() => ({
    totalLearned: wordStore.records.size,
    mastered: getMasteredCount(),
    correct: getCorrectCount(),
    wrong: getWrongCount(),
    accuracy: getAccuracy(),
    sessionsCompleted: studyStore.sessionsCompleted,
    chatMinutes: Math.floor(characterStore.totalChatMs / 60000)
  }))

  return { dailyLogs, streak, overview }
}