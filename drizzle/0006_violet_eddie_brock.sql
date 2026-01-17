CREATE TABLE `teacher_approval_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherProfileId` int NOT NULL,
	`status` varchar(50) NOT NULL,
	`reviewedBy` int NOT NULL,
	`reviewNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teacher_approval_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `teacher_profiles` ADD `status` enum('pending','approved','rejected','suspended') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `teacher_profiles` ADD `submittedAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `teacher_profiles` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `teacher_profiles` ADD `approvedBy` int;--> statement-breakpoint
ALTER TABLE `teacher_profiles` ADD `rejectionReason` varchar(500);