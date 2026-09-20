"""
Splink Identity-Linkage Microservice
Phase 17 — SIH26135 Implementation
Engine: Splink 4.0.17 + DuckDB
"""

import os
import re
import hashlib
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd
from splink import DuckDBAPI, Linker, SettingsCreator, block_on
import splink.comparison_library as cl

app = FastAPI(
    title="NEXIS Splink Identity-Linkage Service",
    description="Fellegi-Sunter probabilistic record linkage service for deduplication and identity resolution",
    version="4.0.17"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TraineeInput(BaseModel):
    id: str
    name: str
    phoneNumber: Optional[str] = None
    dateOfBirth: Optional[str] = None
    district: Optional[str] = None
    email: Optional[str] = None
    phoneHash: Optional[str] = None
    emailHash: Optional[str] = None

class LinkRequest(BaseModel):
    records: List[TraineeInput]
    threshold: Optional[float] = 0.65
    autoLinkThreshold: Optional[float] = 0.92

class PairComparisonRequest(BaseModel):
    recordA: TraineeInput
    recordB: TraineeInput

def soundex(name: str) -> str:
    """Standard Soundex implementation for Indian names phonetic blocking."""
    if not name:
        return "Z000"
    name = re.sub(r'[^A-Za-z]', '', name.upper())
    if not name:
        return "Z000"
    
    first = name[0]
    mapping = {
        'B': '1', 'F': '1', 'P': '1', 'V': '1',
        'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
        'D': '3', 'T': '3',
        'L': '4',
        'M': '5', 'N': '5',
        'R': '6'
    }
    
    encoded = [first]
    prev_code = mapping.get(first, '0')
    for char in name[1:]:
        code = mapping.get(char, '0')
        if code != '0' and code != prev_code:
            encoded.append(code)
            prev_code = code
        elif code == '0':
            prev_code = '0'
    
    soundex_code = "".join(encoded)[:4]
    return soundex_code.ljust(4, '0')

def normalize_phone(phone: Optional[str]) -> str:
    if not phone:
        return ""
    digits = re.sub(r'\D', '', str(phone))
    return digits[-6:] if len(digits) >= 6 else digits

def sha256_hash(val: Optional[str]) -> str:
    if not val:
        return ""
    return hashlib.sha256(val.strip().lower().encode('utf-8')).hexdigest()

def extract_surname(full_name: str) -> str:
    parts = full_name.strip().split()
    return parts[-1] if len(parts) > 1 else full_name.strip()

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "splink-identity-linkage",
        "version": "4.0.17",
        "engine": "duckdb",
        "backend": "Fellegi-Sunter probabilistic linkage"
    }

@app.post("/link-records")
def link_records(req: LinkRequest):
    if len(req.records) < 2:
        return {
            "candidates": [],
            "clusters": {r.id: r.id for r in req.records},
            "summary": {
                "records_ingested": len(req.records),
                "pairs_evaluated": 0,
                "auto_links": 0,
                "review_required": 0
            }
        }

    # Transform records to DataFrame with normalized & hashed features
    rows = []
    for r in req.records:
        norm_phone = normalize_phone(r.phoneNumber)
        p_hash = r.phoneHash or (sha256_hash(r.phoneNumber) if r.phoneNumber else "")
        e_hash = r.emailHash or (sha256_hash(r.email) if r.email else "")
        surname = extract_surname(r.name)
        s_soundex = soundex(surname)
        
        dob_str = ""
        if r.dateOfBirth:
            dob_str = str(r.dateOfBirth)[:10]

        district_clean = (r.district or "").strip().lower()

        rows.append({
            "unique_id": r.id,
            "name": r.name.strip().title(),
            "surname_soundex": s_soundex,
            "dob": dob_str,
            "district": district_clean,
            "phone_last6": norm_phone,
            "phone_hash": p_hash,
            "email_hash": e_hash
        })

    df = pd.DataFrame(rows)

    # Configure Splink 4.0.17 settings with Fellegi-Sunter comparison levels
    settings = SettingsCreator(
        link_type="dedupe_only",
        comparisons=[
            cl.JaroWinklerAtThresholds("name", [0.92, 0.80]),
            cl.ExactMatch("dob"),
            cl.ExactMatch("district"),
            cl.ExactMatch("phone_last6"),
            cl.ExactMatch("surname_soundex")
        ],
        blocking_rules_to_generate_predictions=[
            block_on("district"),
            block_on("dob"),
            block_on("phone_last6"),
            block_on("surname_soundex")
        ]
    )

    db_api = DuckDBAPI()
    try:
        linker = Linker(df, settings, db_api)
        df_predict = linker.inference.predict(threshold_match_probability=req.threshold or 0.65)
        preds = df_predict.as_pandas_dataframe()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Splink inference failed: {str(e)}")

    candidates = []
    auto_links = 0
    review_required = 0

    if not preds.empty:
        for _, row in preds.iterrows():
            prob = float(row.get("match_probability", 0.0))
            id_a = str(row.get("unique_id_l"))
            id_b = str(row.get("unique_id_r"))
            
            # Formulate explainable reasons
            reasons = []
            if row.get("match_key"):
                reasons.append(f"blocking_rule:{row.get('match_key')}")
            
            # Bayes factor / log-odds interpretation
            bayes_factor = prob / (1.0 - prob) if prob < 0.999999 else 999999.0
            reasons.append(f"fellegi_sunter_probability:{prob:.4f}")
            reasons.append(f"bayes_factor:{bayes_factor:.1f}")

            classification = "UNLINKED"
            if prob >= (req.autoLinkThreshold or 0.92):
                classification = "AUTO_LINK"
                auto_links += 1
            elif prob >= (req.threshold or 0.65):
                classification = "REVIEW_REQUIRED"
                review_required += 1

            candidates.append({
                "traineeIdA": id_a,
                "traineeIdB": id_b,
                "matchScore": round(prob, 4),
                "matchProbability": round(prob, 4),
                "bayesFactor": round(bayes_factor, 2),
                "classification": classification,
                "matchReasons": reasons
            })

    # Cluster generation
    clusters = {}
    if not preds.empty:
        try:
            df_clusters = linker.clustering.cluster_pairwise_predictions_at_threshold(
                df_predict, threshold_match_probability=req.threshold or 0.65
            )
            clusters_df = df_clusters.as_pandas_dataframe()
            for _, row in clusters_df.iterrows():
                clusters[str(row["unique_id"])] = str(row["cluster_id"])
        except Exception:
            for r in req.records:
                clusters[r.id] = r.id
    else:
        for r in req.records:
            clusters[r.id] = r.id

    return {
        "candidates": candidates,
        "clusters": clusters,
        "summary": {
            "records_ingested": len(req.records),
            "pairs_evaluated": len(candidates),
            "auto_links": auto_links,
            "review_required": review_required
        }
    }

@app.post("/compare-pair")
def compare_pair(req: PairComparisonRequest):
    req_body = LinkRequest(records=[req.recordA, req.recordB], threshold=0.1)
    res = link_records(req_body)
    candidates = res.get("candidates", [])
    if candidates:
        return candidates[0]
    return {
        "traineeIdA": req.recordA.id,
        "traineeIdB": req.recordB.id,
        "matchScore": 0.0,
        "matchProbability": 0.0,
        "bayesFactor": 0.0,
        "classification": "UNLINKED",
        "matchReasons": ["below_blocking_threshold"]
    }
