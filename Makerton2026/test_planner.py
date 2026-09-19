import json
import unittest

from planner import build_response


class PlannerTest(unittest.TestCase):
    def test_ok_response_has_three_courses(self):
        payload = {
            "center": {"lat": 37.5345, "lng": 126.9895},
            "radius_m": 1000,
            "budget_per_person": 70000,
            "party_size": 2,
            "transport_mode": "walk",
            "start_time": "14:00",
            "duration_hours": 4,
            "vibe_tags": ["quiet", "local food", "aesthetic cafe"],
            "language": "ko",
            "mode": "plan",
        }
        result = build_response(payload)
        self.assertEqual(result["status"], "ok")
        self.assertEqual(len(result["courses"]), 3)
        for course in result["courses"]:
            self.assertEqual(course["place_count"], len(course["stops"]))
            self.assertLessEqual(course["total_duration_min"], 240)
            self.assertLessEqual(course["cost_per_person"], payload["budget_per_person"])

    def test_out_of_scope_response(self):
        payload = {
            "center": {"lat": 37.49, "lng": 127.2},
            "radius_m": 1000,
            "budget_per_person": 50000,
            "party_size": 2,
            "transport_mode": "walk",
            "start_time": "14:00",
            "duration_hours": 4,
            "vibe_tags": ["quiet"],
            "language": "ko",
            "mode": "plan",
        }
        result = build_response(payload)
        self.assertEqual(result["status"], "out_of_scope")
        self.assertEqual(result["courses"], [])


if __name__ == "__main__":
    unittest.main()
