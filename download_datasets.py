#!/usr/bin/env python3
"""Download free pet-nutrition datasets (verified 2026-10-20). Python 3 stdlib only.

Usage:  python download_datasets.py [--dest DIR] [--branded] [--only NAME ...] [--list]
Resumes partial downloads (HTTP Range), skips files already complete.

Licenses (check each source before commercial use):
  opff_*        Open Pet Food Facts - ODbL 1.0 (attribution + share-alike on the database)
  usda_*        USDA FoodData Central - public domain (CC0)
  cnf_2026      Canadian Nutrient File - Open Government Licence - Canada
  figshare_*    Canine diet datasets (figshare 30344017) - CC BY 4.0
  biovet        Bio-Vet/pet-food-safety - data CC BY 4.0 (code license separate)
  kaggle_*      warcoder dog/cat breeds, prajwaldongre breeds - CC0 (Kaggle anonymous download)
  aafco_ch6     AAFCO OP Chapter 6 - COPYRIGHTED: reference only, no reproduction /
                machine-readable conversion / AI training without AAFCO permission
  targets       AAFCO 2014 nutrient profiles + MSD energy formulas (written locally)
NOTE: on 2026-10-20 the OPFF JSONL dump was an empty 20-byte gzip (server-side export issue);
the script warns if so. The HF Parquet export (opff_parquet) and MongoDB dump are fallbacks.
"""
import argparse, os, sys, time, urllib.request, urllib.error, zipfile

FS = "https://ndownloader.figshare.com/files/"
FDC = "https://fdc.nal.usda.gov/fdc-datasets/"
KG = "https://www.kaggle.com/api/v1/datasets/download/"
SOURCES = {
 "opff_jsonl": [("opff/openpetfoodfacts-products.jsonl.gz", "https://static.openpetfoodfacts.org/data/openpetfoodfacts-products.jsonl.gz")],
 "opff_csv": [("opff/en.openpetfoodfacts.org.products.csv.gz", "https://static.openpetfoodfacts.org/data/en.openpetfoodfacts.org.products.csv.gz")],
 "opff_parquet": [("opff/petfood.parquet", "https://huggingface.co/datasets/openfoodfacts/product-database/resolve/main/petfood.parquet?download=true")],
 "opff_mongodump": [("opff/openpetfoodfacts-mongodbdump.gz", "https://static.openpetfoodfacts.org/data/openpetfoodfacts-mongodbdump.gz")],
 "usda_foundation": [("usda_fdc/FoodData_Central_foundation_food_csv_2026-04-30.zip", FDC + "FoodData_Central_foundation_food_csv_2026-04-30.zip")],
 "usda_sr_legacy": [("usda_fdc/FoodData_Central_sr_legacy_food_csv_2018-04.zip", FDC + "FoodData_Central_sr_legacy_food_csv_2018-04.zip")],
 "cnf_2026": [("cnf/cnf_fcen_all-files-data_2026.zip", "https://open.canada.ca/data/dataset/1b6139bd-ed7e-4043-bc28-ff00e10f3109/resource/019f2a90-e3a9-489d-b6e1-f74f4ba1d006/download/cnf_fcen_all-files-data_2026.zip")],
 "figshare_canine": [("figshare_canine/" + n, FS + i) for n, i in [
    ("Vetclinic_dataset.csv", "58688470"), ("Product_and_nutrients.csv", "58688473"),
    ("Canine_disease_and_disorders.csv", "58688476"), ("dog_breed_diseases.csv", "60438989"),
    ("dog_food_Hills_Pet_Nutrition.csv", "60438992"), ("food_ingrediets_2025.csv", "60438995"),
    ("ingredient_standardization.csv", "60438998")]],
 "biovet": [("biovet/pet-food-safety-main.zip", "https://codeload.github.com/Bio-Vet/pet-food-safety/zip/refs/heads/main")],
 "kaggle_breeds": [("breeds/" + r.split("/")[1] + ".zip", KG + r) for r in [
    "warcoder/dog-breeds-details", "prajwaldongre/top-dog-breeds-around-the-world", "warcoder/cat-breeds-details"]],
 "aafco_ch6": [("aafco/2025_OP_Chapter_6_enc.pdf", "https://www.aafco.org/wp-content/uploads/2026/01/2025_OP_Chapter_6_enc.pdf")],
}
OPTIONAL = {"usda_branded": [("usda_fdc/FoodData_Central_branded_food_csv_2026-04-30.zip", FDC + "FoodData_Central_branded_food_csv_2026-04-30.zip")]}  # ~449 MB zip, ~3.1 GB unzipped

AAFCO_CSV = """species,nutrient,unit_per_1000kcal_ME,growth_reproduction_min,adult_maintenance_min,maximum,source_url,source_note
dog,Crude Protein,g,56.3,45.0,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Arginine,g,2.50,1.28,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Histidine,g,1.10,0.48,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Isoleucine,g,1.78,0.95,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Leucine,g,3.23,1.70,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Lysine,g,2.25,1.58,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Methionine,g,0.88,0.83,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Methionine-cystine,g,1.75,1.63,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Phenylalanine,g,2.08,1.13,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Phenylalanine-tyrosine,g,3.25,1.85,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Threonine,g,2.60,1.20,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Tryptophan,g,0.50,0.40,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Valine,g,1.70,1.23,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Crude Fat,g,21.3,13.8,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Linoleic acid,g,3.3,2.8,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,alpha-Linolenic acid,g,0.2,ND,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,EPA+DHA,g,0.1,ND,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Omega6:Omega3 ratio,ratio,,,30:1,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Calcium,g,3.0,1.25,6.25 (4.5 for large-breed puppies),https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Phosphorus,g,2.5,1.00,4.0,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Ca:P ratio,ratio,1:1,1:1,2:1,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Potassium,g,1.5,1.5,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Sodium,g,0.80,0.20,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Chloride,g,1.10,0.30,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Magnesium,g,0.15,0.15,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Iron,mg,22,10,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Copper,mg,3.1,1.83,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Manganese,mg,1.8,1.25,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Zinc,mg,25,20,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Iodine,mg,0.25,0.25,2.75,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Selenium,mg,0.09,0.08,0.5,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Vitamin A,IU,1250,1250,62500,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Vitamin D,IU,125,125,750,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Vitamin E,IU,12.5,12.5,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Thiamine,mg,0.56,0.56,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Riboflavin,mg,1.3,1.3,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Pantothenic acid,mg,3.0,3.0,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Niacin,mg,3.4,3.4,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Pyridoxine,mg,0.38,0.38,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Folic acid,mg,0.054,0.054,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Vitamin B12,mg,0.007,0.007,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
dog,Choline,mg,340,340,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Crude Protein,g,75,65,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Arginine,g,3.10,2.60,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Histidine,g,0.83,0.78,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Isoleucine,g,1.40,1.30,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Leucine,g,3.20,3.10,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Lysine,g,3.00,2.08,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Methionine,g,1.55,0.5,3.75,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Methionine-cystine,g,2.75,1.00,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Phenylalanine,g,1.30,1.05,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Phenylalanine-tyrosine,g,4.80,3.83,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Threonine,g,1.83,1.83,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Tryptophan,g,0.63,0.40,4.25,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Valine,g,1.55,1.55,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Crude Fat,g,22.5,22.5,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Linoleic acid,g,1.40,1.40,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,alpha-Linolenic acid,g,0.05,ND,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Arachidonic acid,g,0.05,0.05,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,EPA+DHA,g,0.03,ND,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Calcium,g,2.5,1.5,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Phosphorus,g,2.0,1.25,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Potassium,g,1.5,1.5,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Sodium,g,0.5,0.5,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Chloride,g,0.75,0.75,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Magnesium,g,0.20,0.10,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Iron,mg,20.0,20.0,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Copper (extruded),mg,3.75,1.25,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Copper (canned),mg,2.10,1.25,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Manganese,mg,1.90,1.90,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Zinc,mg,18.8,18.8,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Iodine,mg,0.45,0.15,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Selenium,mg,0.075,0.075,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Vitamin A,IU,1667,833,83325,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Vitamin D,IU,70,70,7520,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Vitamin E,IU,10,10,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Vitamin K,mg,0.025,0.025,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Thiamine,mg,1.40,1.40,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Riboflavin,mg,1.00,1.00,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Pantothenic acid,mg,1.44,1.44,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Niacin,mg,15,15,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Pyridoxine,mg,1.0,1.0,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Folic acid,mg,0.20,0.20,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Biotin,mg,0.018,0.018,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Vitamin B12,mg,0.005,0.005,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Choline,mg,600,600,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Taurine (extruded),g,0.25,0.25,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
cat,Taurine (canned),g,0.50,0.50,,https://www.aafco.org/wp-content/uploads/2023/01/Pet_Food_Report_Annual_2014-Appendix_A-Revised_AAFCO_Nutrient_Profiles-Final_092214.pdf,"AAFCO 2014 revised profiles (Appendix A, Pet Food Report), calorie basis"
"""
ENERGY_CSV = """species,life_stage_or_status,formula_kcal_per_day,source_url
dog_cat,RER (any weight),70 * BW_kg^0.75,https://www.msdvetmanual.com/management-and-nutrition/nutrition-small-animals/nutritional-requirements-of-small-animals
dog_cat,RER linear (2-45 kg only),30 * BW_kg + 70,https://www.msdvetmanual.com/management-and-nutrition/nutrition-small-animals/nutritional-requirements-of-small-animals
dog,adult intact,1.8 * RER,https://www.msdvetmanual.com/multimedia/table/daily-maintenance-energy-requirements-for-dogs-and-cats
dog,adult neutered,1.6 * RER,https://www.msdvetmanual.com/multimedia/table/daily-maintenance-energy-requirements-for-dogs-and-cats
dog,adult obesity prone,1.4 * RER,https://www.msdvetmanual.com/multimedia/table/daily-maintenance-energy-requirements-for-dogs-and-cats
dog,puppy <4 months,3 * RER,https://www.msdvetmanual.com/multimedia/table/daily-maintenance-energy-requirements-for-dogs-and-cats
dog,puppy >4 months,2 * RER,https://www.msdvetmanual.com/multimedia/table/daily-maintenance-energy-requirements-for-dogs-and-cats
cat,adult intact,1.4 * RER,https://www.msdvetmanual.com/multimedia/table/daily-maintenance-energy-requirements-for-dogs-and-cats
cat,adult neutered,1.2 * RER,https://www.msdvetmanual.com/multimedia/table/daily-maintenance-energy-requirements-for-dogs-and-cats
cat,adult obesity prone,1.0 * RER,https://www.msdvetmanual.com/multimedia/table/daily-maintenance-energy-requirements-for-dogs-and-cats
cat,kitten,2.5 * RER (or free choice),https://www.msdvetmanual.com/multimedia/table/daily-maintenance-energy-requirements-for-dogs-and-cats
"""

def remote_size(url):
    try:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "petfood-dl/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            n = r.headers.get("Content-Length")
            return int(n) if n else None
    except Exception:
        return None

def fetch(url, path, retries=3):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    total = remote_size(url)
    if os.path.exists(path) and total and os.path.getsize(path) == total:
        print("  skip (complete): " + path); return True
    if os.path.exists(path) and not total and os.path.getsize(path) > 0:
        print("  skip (exists, size unknown): " + path); return True
    part = path + ".part"
    for attempt in range(1, retries + 1):
        have = os.path.getsize(part) if os.path.exists(part) else 0
        headers = {"User-Agent": "petfood-dl/1.0"}
        if have: headers["Range"] = "bytes=%d-" % have
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=120) as r:
                mode = "ab" if have and r.status == 206 else "wb"
                if mode == "wb": have = 0
                done, t0, last = have, time.time(), 0
                with open(part, mode) as f:
                    while True:
                        b = r.read(1 << 20)
                        if not b: break
                        f.write(b); done += len(b)
                        if time.time() - last > 1:
                            pct = " %5.1f%%" % (100 * done / total) if total else ""
                            sys.stdout.write("\r  %s %.1f MB%s" % (os.path.basename(path), done / 1e6, pct)); sys.stdout.flush(); last = time.time()
            os.replace(part, path)
            print("\r  ok: %s (%.2f MB)          " % (path, os.path.getsize(path) / 1e6))
            if path.endswith(".jsonl.gz") and os.path.getsize(path) < 1000:
                print("  WARNING: OPFF JSONL is nearly empty (broken upstream export); use CSV or mongodump.")
            return True
        except urllib.error.HTTPError as e:
            if e.code == 416: os.replace(part, path); return True
            print("\n  HTTP %s on %s (attempt %d)" % (e.code, url, attempt))
        except Exception as e:
            print("\n  error %s (attempt %d), will resume" % (e, attempt))
        time.sleep(3 * attempt)
    return False

def write_targets(dest):
    d = os.path.join(dest, "nutrient_profiles"); os.makedirs(d, exist_ok=True)
    for n, c in (("aafco_nutrient_profiles_per1000kcal.csv", AAFCO_CSV), ("energy_requirements_msd.csv", ENERGY_CSV)):
        p = os.path.join(d, n)
        if os.path.exists(p): print("  skip (exists): " + p); continue
        with open(p, "w", encoding="utf-8", newline="") as f: f.write(c)
        print("  wrote: " + p)

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dest", default="petfood_appdata")
    ap.add_argument("--branded", action="store_true", help="also fetch USDA Branded Foods (~449 MB)")
    ap.add_argument("--only", nargs="*", help="subset of source names (see --list)")
    ap.add_argument("--no-unzip", action="store_true")
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args()
    src = dict(SOURCES)
    if a.branded: src.update(OPTIONAL)
    if a.list:
        for k in list(SOURCES) + list(OPTIONAL) + ["targets"]: print(k)
        return
    names = a.only or list(src) + ["targets"]
    failed = []
    for name in names:
        print("[%s]" % name)
        if name == "targets": write_targets(a.dest); continue
        for rel, url in (src.get(name) or OPTIONAL.get(name) or []):
            p = os.path.join(a.dest, *rel.split("/"))
            if not fetch(url, p): failed.append(url); continue
            if p.endswith(".zip") and not a.no_unzip and "branded" not in p:
                out = p[:-4]
                if not os.path.isdir(out):
                    try: zipfile.ZipFile(p).extractall(out); print("  unzipped -> " + out)
                    except zipfile.BadZipFile: print("  WARNING: not a valid zip: " + p)
    print("\nDone." + (" FAILED:\n  " + "\n  ".join(failed) if failed else " All downloads OK."))
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
