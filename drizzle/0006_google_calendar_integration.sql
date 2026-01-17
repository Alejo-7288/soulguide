-- Google Calendar Integration Migration

-- Table to store teacher's Google Calendar OAuth tokens
CREATE TABLE IF NOT EXISTS `google_calendar_tokens` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `teacherProfileId` int NOT NULL UNIQUE,
  `accessToken` varchar(500) NOT NULL,
  `refreshToken` varchar(500) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `calendarId` varchar(255) NOT NULL,
  `isActive` boolean NOT NULL DEFAULT true,
  `connectedAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `google_calendar_tokens_teacherProfileId_fk` 
    FOREIGN KEY (`teacherProfileId`) REFERENCES `teacher_profiles`(`id`) ON DELETE CASCADE
);

-- Table to store synced busy time slots from Google Calendar
CREATE TABLE IF NOT EXISTS `google_calendar_busy_slots` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `teacherProfileId` int NOT NULL,
  `eventId` varchar(255) NOT NULL,
  `eventTitle` varchar(255),
  `startTime` timestamp NOT NULL,
  `endTime` timestamp NOT NULL,
  `syncedAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `google_calendar_busy_slots_teacherProfileId_fk` 
    FOREIGN KEY (`teacherProfileId`) REFERENCES `teacher_profiles`(`id`) ON DELETE CASCADE
);

-- Index for efficient querying of busy slots by teacher and time range
CREATE INDEX IF NOT EXISTS `idx_teacher_time` ON `google_calendar_busy_slots` (`teacherProfileId`, `startTime`, `endTime`);
