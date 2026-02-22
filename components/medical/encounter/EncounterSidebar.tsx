"use client";

import PatientContextCard from "./PatientContextCard";
import type { EncounterPatient } from "./types";

export default function EncounterSidebar({
  patient
}: {
  patient: EncounterPatient;
}) {
  return (
    <div className="space-y-4">
      <PatientContextCard patient={patient} />
    </div>
  );
}
