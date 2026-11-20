import { ExerciseHistory } from '@/features/fortschritt/ExerciseHistory';
import { ExerciseDetailScreen } from '@/features/uebungen/ExerciseDetailScreen';

export default function ExerciseDetailRoute() {
  return <ExerciseDetailScreen historySlot={(id) => <ExerciseHistory exerciseId={id} />} />;
}
