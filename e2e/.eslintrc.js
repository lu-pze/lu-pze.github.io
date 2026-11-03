module.exports = {
    "env": { "node": true },
    "parserOptions": { "sourceType": "script" },
    // Globals of the src/ scripts, used inside page.evaluate() callbacks (they run in the browser).
    // Add a name here when a spec first reads it.
    "globals": {
        "bode_graphs": "readonly", "splash_screen_active": "readonly", "start_quiz": "readonly",
        "range_slider_variables": "readonly", "variable_position": "readonly", "done_achievements": "readonly",
        "pole_zero_graph_x": "readonly", "pole_zero_graph_y": "readonly",
        "pole_zero_width": "readonly", "pole_zero_height": "readonly",
        "graph_bode_mag_x": "readonly", "graph_bode_mag_y": "readonly",
        "graph_bode_mag_x_offset": "readonly", "graph_bode_mag_y_offset": "readonly",
        "graph_bode_mag_width": "readonly", "graph_bode_mag_height": "readonly",
        "graph_step_response_x": "readonly", "graph_step_response_y": "readonly",
        "graph_step_response_x_offset": "readonly", "graph_step_response_y_offset": "readonly",
        "graph_step_response_width": "readonly", "graph_step_response_height": "readonly",
        "gain_upper_bound": "readonly", "y_case_gain": "readonly", "precision": "readonly",
        "min_y_timerep": "readonly", "max_y_timerep": "readonly", "map": "readonly",
        "clicked_on_bode_mag_graph_no": "readonly", "clicked_on_time_response_graph_no": "readonly",
        "set_difficulty_level": "readonly", "quiz_questions": "readonly", "enabled_quiz_types": "readonly",
        "quiz_lets_go_practice": "readonly", "current_quiz": "readonly", "quiz_freq": "readonly",
        "quiz_nof_correct": "readonly", "quiz_nof_tries": "readonly", "quiz_current_streak": "readonly",
        "quiz_timeline": "readonly"
    }
};
