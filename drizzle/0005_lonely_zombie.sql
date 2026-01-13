CREATE TABLE `teacher_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherProfileId` int NOT NULL,
	`verificationTypeId` int NOT NULL,
	`status` enum('pending','approved','rejected','expired') NOT NULL DEFAULT 'pending',
	`fileUrl` text NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileSize` int NOT NULL,
	`fileType` varchar(100) NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	`reviewedBy` int,
	`reviewNotes` text,
	`rejectionReason` text,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teacher_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verification_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`verificationId` int NOT NULL,
	`status` varchar(50) NOT NULL,
	`changedBy` int NOT NULL,
	`notes` text,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verification_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`isRequired` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_types_id` PRIMARY KEY(`id`)
);
