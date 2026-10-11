/**
 * Example audits offered from the homepage.
 *
 * Each one is a real, self-contained source + answer pair that produces a
 * genuinely mixed set of verdicts against the live backend, so a judge sees
 * Supported, Contradicted and Not stated in one run. Nothing here is used by
 * the audit itself — these only fill the input fields.
 */
export interface Sample {
  id: string
  label: string
  hint: string
  source: string
  answer: string
}

export const SAMPLES: Sample[] = [
  {
    id: 'stipend',
    label: 'Policy numbers',
    hint: 'Two wrong figures — expect Contradicted',
    source: [
      'NORTHWIND LOGISTICS — REMOTE WORK POLICY (2026 EDITION)',
      '',
      '1. Scope',
      'This policy applies to all permanent employees of Northwind Logistics after their probationary period. Contractors and agency staff are covered by a separate agreement.',
      '',
      '2. Working location',
      'Employees may work remotely up to three days per week with written approval from their line manager. Remote days must be recorded in the scheduling system before 10:00 on the day they are taken.',
      '',
      '4. Equipment',
      'Northwind provides a home-office equipment stipend of 400 USD per year, claimable against receipts submitted through the expenses portal. Unused allowance does not roll over into the next year.',
      '',
      '5. Reimbursement',
      'Home-office equipment is reimbursed once every two years, up to a maximum of 750 USD. Claims must be filed within 30 days of purchase and require a manager approval code.',
      '',
      '7. Review and records',
      'Managers must review every remote working arrangement at least once per quarter and record the outcome in the HR system.',
    ].join('\n'),
    answer: [
      'Under the Northwind remote work policy, employees may work remotely up to three days per week.',
      'The home-office equipment stipend is 900 USD per year and unused allowance rolls over.',
      'Home-office equipment is reimbursed once every two years up to 750 USD.',
      'Managers must review every remote working arrangement once a year.',
      'All employees receive a company car allowance of 200 USD per month.',
    ].join(' '),
  },
  {
    id: 'safety',
    label: 'Safety data sheet',
    hint: 'Absent + inference claims — expect Not stated',
    source: [
      'MERIDIAN LABS — CHEMICAL HANDLING NOTICE (REV. 4)',
      '',
      '1. Storage',
      'Sodium hydroxide must be stored below 25 degrees Celsius in a ventilated, locked cabinet. Containers must be inspected monthly for corrosion.',
      '',
      '2. Personal protective equipment',
      'Handling sodium hydroxide requires nitrile gloves, splash-proof goggles and a lab coat. A full face shield is required when decanting solutions above 2 mol per litre.',
      '',
      '3. Spill response',
      'Small spills must be neutralised with dilute acetic acid and absorbed with vermiculite. Large spills require evacuation of the room and notification of the duty supervisor within 15 minutes.',
      '',
      '4. First aid',
      'Contact with skin must be irrigated with running water for at least 20 minutes. Eye contact requires immediate medical assessment.',
    ].join('\n'),
    answer: [
      'Sodium hydroxide must be stored below 25 degrees Celsius in a ventilated, locked cabinet.',
      'You should therefore keep a full face shield on at all times in the lab.',
      'The notice states that spills must be reported to the fire service within 15 minutes.',
      'Meridian Labs recommends importing storage cabinets from a supplier in Finland.',
    ].join(' '),
  },
]

/** The default example chip; users can pick the other from the row. */
export const DEFAULT_SAMPLE = SAMPLES[0]
