"use client";

import { useState } from "react";
import CapacityRuleForm from "./CapacityRuleForm";
import MonthlyCalendar from "./MonthlyCalendar";
import CloseOutManager from "./CloseOutManager";

interface CapacityRule {
  id: string;
  ruleType: string;
  daysOfWeek: number[];
  startDate: string | null;
  endDate: string | null;
  singleDate: string | null;
  startTimes: { hour: number; minute: number }[];
  capacity: number;
  minParticipants: number;
  priority: number;
  isActive: boolean;
}

interface CloseOut {
  id: string;
  date: string;
  startTime: { hour: number; minute: number } | null;
  reason: string | null;
}

interface Schedule {
  id: string;
  startDateTime: string;
  endDateTime: string;
  capacity: number;
  status: string;
}

interface Props {
  capacityRules: CapacityRule[];
  closeOuts: CloseOut[];
  schedules: Schedule[];
  tourId: string;
  durationMinutes: number;
  maxParticipants: number;
  authFetch: (path: string, options?: RequestInit) => Promise<any>;
  onRefresh: () => Promise<void>;
}

export default function ScheduleManager({
  capacityRules,
  closeOuts,
  schedules,
  tourId,
  durationMinutes,
  maxParticipants,
  authFetch,
  onRefresh,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<{ time: string; closedOut: boolean }[]>([]);

  function handleDateClick(date: Date, slots: { time: string; closedOut: boolean }[]) {
    setSelectedDate(date);
    setSelectedSlots(slots);
  }

  function handleClosePopover() {
    setSelectedDate(null);
    setSelectedSlots([]);
  }

  return (
    <div>
      {/* Capacity rules */}
      <CapacityRuleForm
        rules={capacityRules}
        tourId={tourId}
        authFetch={authFetch}
        onRefresh={onRefresh}
      />

      {/* Monthly calendar */}
      <div style={{ marginTop: 24 }}>
        <MonthlyCalendar
          capacityRules={capacityRules}
          closeOuts={closeOuts}
          schedules={schedules}
          onDateClick={handleDateClick}
          tourId={tourId}
          authFetch={authFetch}
          onRefresh={onRefresh}
        />
      </div>

      {/* Close-out manager popover */}
      {selectedDate && (
        <CloseOutManager
          date={selectedDate}
          slots={selectedSlots}
          closeOuts={closeOuts}
          tourId={tourId}
          durationMinutes={durationMinutes}
          authFetch={authFetch}
          onRefresh={onRefresh}
          onClose={handleClosePopover}
        />
      )}
    </div>
  );
}
