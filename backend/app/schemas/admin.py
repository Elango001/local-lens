from typing import Dict, Any, List
from pydantic import BaseModel

class AdminStatsOut(BaseModel):
    total_registered_businesses: int
    pending_verifications: int
    verified_businesses: int
    rejected_businesses: int
    pending_reports: int
    auto_takedowns_count: int
    total_reports: int
    categories_breakdown: Dict[str, int]
    cities_breakdown: Dict[str, int]
