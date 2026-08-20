import type { Exercise, ExercisePrescription } from "./types";
import { validatePrescription } from "./validation";

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm;
}

function baseDoseInstruction(
  exercise: Exercise,
  prescription: ExercisePrescription,
): string {
  const dose = prescription.dose;
  switch (prescription.doseType ?? exercise.doseType) {
    case "repetitions":
      return `${dose.repetitions} ${plural(dose.repetitions!, "repetition")}`;
    case "repetitions-each-side":
      return `${dose.repetitionsPerSide} ${plural(dose.repetitionsPerSide!, "repetition")} on each side`;
    case "duration":
      return `${dose.durationSeconds} ${plural(dose.durationSeconds!, "second")}`;
    case "hold":
      return `${dose.holdSeconds} ${plural(dose.holdSeconds!, "second")}`;
    case "free":
      return "";
  }
}

export function exerciseInstruction(
  exercise: Exercise,
  prescription: ExercisePrescription,
): string | null {
  if (!validatePrescription(prescription, exercise).valid) return null;
  const doseType = prescription.doseType ?? exercise.doseType;
  if (doseType === "free") return "Continue until instructed to stop.";

  const dose = baseDoseInstruction(exercise, prescription);
  if (doseType === "duration") {
    const instruction = `Perform this exercise for ${dose}.`;
    return prescription.sets && prescription.sets > 1
      ? `${instruction} Complete ${prescription.sets} sets.`
      : instruction;
  }
  if (prescription.sets && prescription.sets > 1) {
    if (doseType === "hold") return `Complete ${prescription.sets} sets. Hold for ${dose}.`;
    return `Complete ${prescription.sets} sets of ${dose}.`;
  }
  if (doseType === "hold") return `Hold for ${dose}.`;
  return `Complete ${dose}.`;
}

export function setProgressInstruction(currentSet: number, totalSets: number): string | null {
  if (
    !Number.isInteger(currentSet) ||
    !Number.isInteger(totalSets) ||
    currentSet < 1 ||
    totalSets < 1 ||
    currentSet > totalSets
  ) {
    return null;
  }
  return `Set ${currentSet} of ${totalSets}`;
}

export function restInstruction(restSeconds: number | undefined): string | null {
  if (restSeconds === undefined || !Number.isInteger(restSeconds) || restSeconds < 0) {
    return null;
  }
  return `Rest for ${restSeconds} ${plural(restSeconds, "second")}.`;
}
