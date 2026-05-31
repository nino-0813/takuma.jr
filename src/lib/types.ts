export type Role = "admin" | "member";

export interface Team {
  id: string;
  name: string;
  emoji: string | null;
  invite_code: string;
  created_at: string;
}

export interface Member {
  id: string;
  team_id: string;
  name: string;
  role: Role;
  child_name: string | null;
  jersey_number: number | null;
  phone: string | null;
  created_at: string;
}

export type EventType = "match" | "practice" | "other";

export interface TeamEvent {
  id: string;
  team_id: string;
  type: EventType;
  title: string;
  opponent: string | null;
  location: string | null;
  start_at: string; // ISO
  meet_time: string | null; // "08:30" など
  notes: string | null;
  created_at: string;
}

export type AttendanceStatus = "yes" | "no" | "maybe";

export interface Attendance {
  id: string;
  event_id: string;
  member_id: string;
  status: AttendanceStatus;
  comment: string | null;
  updated_at: string;
}

export interface Duty {
  id: string;
  team_id: string;
  date: string; // YYYY-MM-DD
  type: string; // "key" など
  member_id: string | null;
  note: string | null;
}

export interface Announcement {
  id: string;
  team_id: string;
  member_id: string | null;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
}

export interface Carpool {
  id: string;
  event_id: string;
  driver_member_id: string;
  seats: number;
  departure_place: string | null;
  departure_time: string | null;
  note: string | null;
  created_at: string;
}

export interface CarpoolRider {
  id: string;
  carpool_id: string;
  member_id: string;
  created_at: string;
}
