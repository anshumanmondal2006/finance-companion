def plan_goal(goal_type, timeline, target=None):

    if goal_type == "wealth":
        return {
            "goal_strategy": "growth",
            "timeline": timeline
        }

    if goal_type == "target":
        return {
            "goal_strategy": "target_amount",
            "target": target,
            "timeline": timeline
        }

    if goal_type == "retirement":
        return {
            "goal_strategy": "long_term_income",
            "timeline": timeline
        }