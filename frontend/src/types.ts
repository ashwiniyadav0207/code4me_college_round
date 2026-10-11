export type Verdict =
  | 'Supported'
  | 'Contradicted'
  | 'Not stated in source'
  | 'Ambiguous/conflicting'

export type ClaimType = 'fact' | 'inference' | 'recommendation'

export type EvidenceStatus =
  | 'verified'
  | 'partial'
  | 'unverified'
  | 'missing'
  | 'not_required'

export interface Evidence {
  quote: string
  verified: boolean
  page: number | null
  model_page: number | null
  status: string
  note: string
}

export interface Claim {
  id: string
  claim_text: string
  claim_type: ClaimType
  span_start: number | null
  span_end: number | null
  verdict: Verdict
  model_verdict?: string
  explanation: string
  evidence: Evidence[]
  evidence_status: EvidenceStatus
  evidence_note?: string | null
  evidence_verified: boolean
  needs_review: boolean
  review_reason: string | null
}

export interface Summary {
  total: number
  supported: number
  contradicted: number
  not_stated: number
  ambiguous: number
  needs_review: number
}

export interface SourceInfo {
  origin: 'pdf' | 'text'
  file_name: string | null
  file_size: number | null
  pages: number
  chars: number
}

export interface AnalyseResult {
  claims: Claim[]
  summary: Summary
  source_info: SourceInfo
  model: string
  span_mapping_available: boolean
  evidence_note: string
}

export const VERDICT_ORDER: Verdict[] = [
  'Supported',
  'Contradicted',
  'Not stated in source',
  'Ambiguous/conflicting',
]

export function verdictClass(verdict: Verdict): string {
  switch (verdict) {
    case 'Supported':
      return 'v-supported'
    case 'Contradicted':
      return 'v-contradicted'
    case 'Not stated in source':
      return 'v-not-stated'
    default:
      return 'v-ambiguous'
  }
}

export function highlightClass(verdict: Verdict): string {
  switch (verdict) {
    case 'Supported':
      return 'hl-supported'
    case 'Contradicted':
      return 'hl-contradicted'
    case 'Not stated in source':
      return 'hl-not-stated'
    default:
      return 'hl-ambiguous'
  }
}

export function evidenceStatusLabel(status: EvidenceStatus): string {
  switch (status) {
    case 'verified':
      return 'Evidence verified'
    case 'partial':
      return 'Evidence partly verified'
    case 'unverified':
      return 'Evidence unverified'
    case 'missing':
      return 'No evidence supplied'
    default:
      return 'No evidence required'
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export interface RepairResult {
  status: 'repaired' | 'insufficient_evidence'
  reason_code: 'replacement_missing' | 'evidence_missing' | 'evidence_unverified' | null
  original_claim: string
  original_verdict: string | null
  suggested_replacement: string | null
  explanation: string
  evidence: Evidence[]
  evidence_status: EvidenceStatus
  needs_review: boolean
  source_info: SourceInfo
  model: string
  note: string
}

export interface CourtroomSide {
  argument: string
  evidence: Evidence[]
  evidence_status: EvidenceStatus
  source_supports_claim?: boolean
}

export interface CourtroomJudge {
  verdict: string
  reasoning: string
  evidence: Evidence[]
  evidence_status: EvidenceStatus
  needs_review: boolean
  review_reason: string | null
}

export interface CourtroomResult {
  claim_text: string
  claim_verdict_from_audit: string | null
  prosecutor: CourtroomSide
  defender: CourtroomSide
  judge: CourtroomJudge
  method: string
  source_info: SourceInfo
  model: string
  evidence_note: string
}
