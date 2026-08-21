package governance

default decisions = []

decisions = output {
  input.context.destination == "google_ads"
  input.event.marketing_consent != true
  output := [{
    "policy_id": "policy_ad_marketing_consent",
    "description": "Advertising activation requires marketing_consent == true",
    "result": "deny",
    "reason": "missing_marketing_consent"
  }]
}

decisions = output {
  input.context.destination == "google_ads"
  input.event.pan
  output := [{
    "policy_id": "policy_no_pan_to_marketing",
    "description": "PAN must not be sent to marketing destinations",
    "result": "deny",
    "reason": "pan_in_payload"
  }]
}

decisions = output {
  input.context.destination == "google_ads"
  input.event.income
  output := [{
    "policy_id": "policy_mask_income_for_marketing",
    "description": "Income can be used but must be masked for marketing destinations",
    "result": "modify",
    "action": "mask_income"
  }]
}

# fallback if no rule matches

decisions = [] {
  true
}
