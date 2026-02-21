import re
import uuid
from datetime import datetime, timezone
from app.extensions import mongo


def parse_filename(filename, fmt):
    """
    Extract roll_no and student_name from a filename using the format string.

    Supported format tokens:
      {rollno}   maps to a group of word characters (alphanumeric + _ )
      {name}     maps to a group of word characters

    Example: fmt = "rollno_name" with filename "CS101_John.py"
             → roll_no="CS101", student_name="John"

    Returns (roll_no, student_name). Either may be None if not in format.
    """
    if not fmt:
        return None, None

    # Strip file extension from filename before matching
    base = filename.rsplit(".", 1)[0] if "." in filename else filename

    # Build regex from format string
    pattern = re.escape(fmt)
    pattern = pattern.replace("rollno", r"(?P<rollno>[\w]+)")
    pattern = pattern.replace("name", r"(?P<name>[\w]+)")
    pattern = "^" + pattern + "$"

    m = re.match(pattern, base)
    if not m:
        return None, None

    roll_no = m.group("rollno") if "rollno" in m.groupdict() else None
    student_name = m.group("name") if "name" in m.groupdict() else None
    return roll_no, student_name


class Assignment:

    @staticmethod
    def create(user_id, title, description="", submission_type="code",
               filename_format=None):
        doc = {
            "user_id": user_id,
            "title": title,
            "description": description,
            "submission_type": submission_type,      # "code" | "text" | "pdf"
            "filename_format": filename_format,      # e.g. "rollno_name" or None
            "submissions": [],
            "analyses": [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = mongo.db.assignments.insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc

    @staticmethod
    def get_by_id(assignment_id):
        return mongo.db.assignments.find_one({"_id": assignment_id})

    @staticmethod
    def list_by_user(user_id):
        return list(
            mongo.db.assignments.find({"user_id": user_id})
            .sort("updated_at", -1)
        )

    @staticmethod
    def update(assignment_id, updates):
        updates["updated_at"] = datetime.now(timezone.utc)
        mongo.db.assignments.update_one(
            {"_id": assignment_id},
            {"$set": updates}
        )

    @staticmethod
    def delete(assignment_id):
        mongo.db.assignments.delete_one({"_id": assignment_id})

    @staticmethod
    def add_submissions(assignment_id, submissions):
        """
        Append submissions to the assignment.

        Each submission dict should contain:
          - type: "file" | "text"
          - original_name: str | None
          - stored_path: str | None  (for files)
          - text_content: str | None (for text)
          - roll_no: str | None
          - student_name: str | None
        """
        now = datetime.now(timezone.utc)
        for s in submissions:
            s.setdefault("id", str(uuid.uuid4()))
            s.setdefault("uploaded_at", now)

        mongo.db.assignments.update_one(
            {"_id": assignment_id},
            {
                "$push": {"submissions": {"$each": submissions}},
                "$set": {"updated_at": now},
            }
        )

    @staticmethod
    def remove_submission(assignment_id, submission_id):
        now = datetime.now(timezone.utc)
        mongo.db.assignments.update_one(
            {"_id": assignment_id},
            {
                "$pull": {"submissions": {"id": submission_id}},
                "$set": {"updated_at": now},
            }
        )

    @staticmethod
    def add_analysis(assignment_id, analysis_type, report_id):
        now = datetime.now(timezone.utc)
        mongo.db.assignments.update_one(
            {"_id": assignment_id},
            {
                "$push": {
                    "analyses": {
                        "type": analysis_type,
                        "report_id": str(report_id),
                        "created_at": now,
                    }
                },
                "$set": {"updated_at": now},
            }
        )
