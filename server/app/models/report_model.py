from app.extensions import mongo
from datetime import datetime, timezone


class Report:
    @staticmethod
    def create_report(user_id, response):
        report = {
            "user_id": user_id,
            "report": response,
            "created_at": datetime.now(timezone.utc),
        }
        return mongo.db.reports.insert_one(report)

    @staticmethod
    def get_report(report_id):
        print(report_id)
        return mongo.db.reports.find_one({"_id": report_id})

    @staticmethod
    def get_reports_by_user(user_id):
        return mongo.db.reports.find({"user_id": user_id}).sort("created_at", -1)

    @staticmethod
    def get_all_reports():
        return mongo.db.reports.find()

    @staticmethod
    def delete_report(report_id):
        return mongo.db.reports.delete_one({"_id": report_id})
