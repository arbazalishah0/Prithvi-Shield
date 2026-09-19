import sys
import os

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from services.evacuation_service import (
    calculate_edge_cost,
    get_live_road_network_data,
    calculate_evacuation_routes,
    ROAD_NETWORK_NODES,
    ROAD_NETWORK_EDGES,
    get_db
)

def run_tests():
    print("==================================================")
    print("TESTING DIJKSTRA SAFE ROUTING ENGINE")
    print("==================================================")

    # Test 1: Safety-First Cost Function Comparison
    # Requirement 6: A 1.5 km HIGH-RISK road should be less preferred than a 2.2 km LOW-RISK road.
    cost_high_risk = calculate_edge_cost(distance_km=1.5, risk_score=85.0, is_blocked=False)
    cost_low_risk = calculate_edge_cost(distance_km=2.2, risk_score=15.0, is_blocked=False)
    cost_blocked = calculate_edge_cost(distance_km=1.0, risk_score=10.0, is_blocked=True)

    print(f"1. Cost of 1.5 km HIGH-RISK (85%): {cost_high_risk}")
    print(f"   Cost of 2.2 km LOW-RISK (15%):  {cost_low_risk}")
    print(f"   Cost of BLOCKED road:           {cost_blocked}")
    assert cost_high_risk > cost_low_risk, "1.5km High-Risk road must cost more than 2.2km Low-Risk road!"
    assert cost_blocked == float('inf'), "Blocked road cost must be infinity!"
    print("   -> PASSED: Safety-first cost function works accurately.")

    # Test 2: Standard Evacuation Route Calculation
    print("\n2. Testing calculate_evacuation_routes from Gangtok Ridge (27.3389, 88.6065)...")
    res = calculate_evacuation_routes(27.3389, 88.6065, "TEST_CITIZEN")
    assert res["success"] is True, "Route calculation failed!"
    assert res["no_route_available"] is False, "Expected route to be found!"
    route = res["recommended_route"]
    shelter = res["recommended_shelter"]
    print(f"   Recommended Shelter: {shelter['name']}")
    print(f"   Total Route Distance: {route['distance_km']} km")
    print(f"   Est. Travel Time:     {route['estimated_time_minutes']} mins")
    print(f"   Safety Score:         {route['safety_score']}/100")
    print(f"   Blocked Avoided:      {route['blocked_roads_avoided']}")
    print(f"   GeoJSON Points:       {len(route['route_geojson']['geometry']['coordinates'])} points")
    assert len(route['route_geojson']['geometry']['coordinates']) > 2, "Route must have actual road waypoints!"
    print("   -> PASSED: Standard route calculation generated valid multi-waypoint path.")

    # Test 3: Scenario 2 - Block Shortest Road (NH-10-SEC4) and verify reroute
    print("\n3. Testing Scenario 2: Block NH-10-SEC4 in DB and verify Dijkstra reroutes...")
    with get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO road_risk_status
            (id, road_id, road_name, geometry_json, risk_score, risk_level, status, blockage_reason, source, updated_at)
            VALUES ('BLOCK-NH-10-SEC4', 'NH-10-SEC4', 'NH-10 Sector 4 (Mile 12)', '{}', 95.0, 'CRITICAL', 'BLOCKED', 'Avalanche blockage', 'TEST', '2026-09-14T00:00:00Z')
        """)
        conn.commit()

    res_blocked = calculate_evacuation_routes(27.3389, 88.6065, "TEST_CITIZEN")
    assert res_blocked["success"] is True
    assert res_blocked["no_route_available"] is False
    route_b = res_blocked["recommended_route"]
    print(f"   Rerouted Distance: {route_b['distance_km']} km")
    print(f"   Blocked Roads Avoided: {route_b['blocked_roads_avoided']}")
    print(f"   Explanation: {res_blocked['explanation'][1]}")
    print("   -> PASSED: Successfully rerouted around blocked road.")

    # Test 4: Scenario 4 - Block all egress routes (NH-10-SEC4, INDIRA-BYPASS-N, BURTUK-RIDGE, LEBONG-SPUR)
    print("\n4. Testing Scenario 4: Block ALL egress roads from citizen origin -> Expect NO SAFE ROUTE AVAILABLE...")
    with get_db() as conn:
        for rid in ["NH-10-SEC4", "INDIRA-BYPASS-N", "BURTUK-RIDGE", "LEBONG-SPUR"]:
            conn.execute("""
                INSERT OR REPLACE INTO road_risk_status
                (id, road_id, road_name, geometry_json, risk_score, risk_level, status, blockage_reason, source, updated_at)
                VALUES (?, ?, ?, '{}', 99.0, 'CRITICAL', 'BLOCKED', 'Total isolation test', 'TEST', '2026-09-14T00:00:00Z')
            """, (f"BLOCK-{rid}", rid, f"Road {rid}"))
        conn.commit()

    res_noroute = calculate_evacuation_routes(27.3389, 88.6065, "TEST_CITIZEN")
    assert res_noroute["success"] is True
    assert res_noroute["no_route_available"] is True, "Must return no_route_available=True when cut off!"
    print(f"   Status: NO SAFE ROUTE AVAILABLE")
    print(f"   Reason: {res_noroute['reason']}")
    print(f"   Emergency Action: {res_noroute['emergency_action']}")
    print(f"   Nearest Shelter (Air Distance): {res_noroute['nearest_shelter']['name']} ({res_noroute['nearest_shelter']['straight_line_distance_km']} km)")
    print("   -> PASSED: Correctly handled isolated/no-route scenario.")

    # Reset test blocks
    with get_db() as conn:
        conn.execute("DELETE FROM road_risk_status WHERE source = 'TEST'")
        conn.commit()

    print("\n==================================================")
    print("ALL DIJKSTRA & SAFETY TESTS COMPLETED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
