from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from datetime import datetime, timezone , timedelta
from extensions import db
from bson import ObjectId
from uuid import uuid4
from io import BytesIO
from flask import send_file
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    Preformatted
)
from xml.sax.saxutils import escape
exam_bp = Blueprint("exams", __name__)


# CREATE EXAMINATION
@exam_bp.route("/create", methods=["POST"])
@jwt_required()
def create_exam():

    claims = get_jwt()

    if claims.get("role") != "admin":
        return jsonify({"message": "Admin access required"}), 403

    data = request.get_json() or {}

    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    duration = data.get("duration", 60)

    if not title:
        return jsonify({"message": "Exam title is required"}), 400

    if not isinstance(duration, int) or isinstance(duration, bool) or duration < 1:
        return jsonify({
            "message": "Duration must be a positive whole number"
        }), 400

    exam = {
        "title": title,
        "description": description,
        "duration": duration,
        "total_questions": 0,
        "required_questions": 10,
        "status": "draft",
        "created_at": datetime.now(timezone.utc)
    }

    result = db.exams.insert_one(exam)

    return jsonify({
        "message": "Exam created successfully",
        "exam_id": str(result.inserted_id),
        "exam": {
            "title": title,
            "description": description,
            "duration": duration,
            "status": "draft"
        }
    }), 201


# GET ALL EXAMINATIONS (ADMIN)
@exam_bp.route("/all", methods=["GET"])
@jwt_required()
def get_all_exams():

    claims = get_jwt()

    if claims.get("role") != "admin":
        return jsonify({"message": "Admin access required"}), 403

    exams = list(db.exams.find().sort("created_at", -1))

    exam_list = []

    for exam in exams:
        exam_list.append({
            "id": str(exam["_id"]),
            "title": exam.get("title", ""),
            "description": exam.get("description", ""),
            "duration": exam.get("duration", 60),
            "total_questions": exam.get("total_questions", 0),
            "required_questions": exam.get("required_questions", 10),
            "status": exam.get("status", "draft"),
            "created_at": exam.get("created_at").isoformat()
                if exam.get("created_at") else None
        })

    return jsonify({
        "exams": exam_list,
        "total": len(exam_list)
    }), 200


# ADD EXAMINATION QUESTION
@exam_bp.route("/<exam_id>/questions", methods=["POST"])
@jwt_required()
def add_question(exam_id):

    claims = get_jwt()

    if claims.get("role") != "admin":
        return jsonify({"message": "Admin access required"}), 403

    if not ObjectId.is_valid(exam_id):
        return jsonify({"message": "Invalid examination ID"}), 400

    exam = db.exams.find_one({"_id": ObjectId(exam_id)})

    if not exam:
        return jsonify({"message": "Examination not found"}), 404

    if exam.get("status") != "draft":
        return jsonify({
            "message": "Questions cannot be modified after publishing"
        }), 400

    data = request.get_json() or {}

    question_text = data.get("question", "").strip()
    question_type = data.get("question_type")
    marks = data.get("marks")

    if not question_text:
        return jsonify({"message": "Question text is required"}), 400

    if question_type not in ["mcq", "descriptive", "coding"]:
        return jsonify({"message": "Invalid question type"}), 400

    if not isinstance(marks, int) or isinstance(marks, bool) or marks < 1:
        return jsonify({
            "message": "Marks must be a positive whole number"
        }), 400

    question = {
        "exam_id": ObjectId(exam_id),
        "question": question_text,
        "question_type": question_type,
        "marks": marks
    }

    # MCQ QUESTION
    if question_type == "mcq":

        options = data.get("options", [])
        correct_answer = data.get("correct_answer")

        if not isinstance(options, list) or len(options) != 4:
            return jsonify({
                "message": "Exactly four options are required"
            }), 400

        if not all(
            isinstance(option, str) and option.strip()
            for option in options
        ):
            return jsonify({
                "message": "All four options must contain text"
            }), 400

        if (
            not isinstance(correct_answer, int)
            or isinstance(correct_answer, bool)
            or correct_answer not in range(4)
        ):
            return jsonify({
                "message": "Select a valid correct answer"
            }), 400

        option_records = [
            {
                "id": str(uuid4()),
                "text": option.strip()
            }
            for option in options
        ]

        question["options"] = option_records
        question["correct_option_id"] = option_records[correct_answer]["id"]

    # PYTHON CODING QUESTION
    elif question_type == "coding":

        starter_code = data.get("starter_code", "")

        if not isinstance(starter_code, str):
            return jsonify({
                "message": "Starter code must be text"
            }), 400

        question["starter_code"] = starter_code

    # DESCRIPTIVE QUESTION
    elif question_type == "descriptive":

        pass

    result = db.questions.insert_one(question)

    db.exams.update_one(
        {"_id": ObjectId(exam_id)},
        {"$inc": {"total_questions": 1}}
    )

    return jsonify({
        "message": "Question added successfully",
        "question_id": str(result.inserted_id)
    }), 201


# GET EXAM QUESTIONS (ADMIN ONLY)
@exam_bp.route("/<exam_id>/questions", methods=["GET"])
@jwt_required()
def get_exam_questions(exam_id):

    claims = get_jwt()

    if claims.get("role") != "admin":
        return jsonify({"message": "Admin access required"}), 403

    if not ObjectId.is_valid(exam_id):
        return jsonify({"message": "Invalid examination ID"}), 400

    exam = db.exams.find_one({"_id": ObjectId(exam_id)})

    if not exam:
        return jsonify({"message": "Examination not found"}), 404

    questions = list(db.questions.find({
        "exam_id": ObjectId(exam_id)
    }))

    question_list = []

    for question in questions:

        item = {
            "id": str(question["_id"]),
            "question": question["question"],
            "question_type": question["question_type"],
            "marks": question["marks"]
        }

        if question["question_type"] == "mcq":

            options = question.get("options", [])

            item["options"] = [
                option["text"] for option in options
            ]

            item["correct_answer"] = next(
                (
                    index
                    for index, option in enumerate(options)
                    if option["id"] == question.get("correct_option_id")
                ),
                None
            )

        elif question["question_type"] == "coding":

            item["starter_code"] = question.get("starter_code", "")

        question_list.append(item)

    return jsonify({
        "questions": question_list,
        "total": len(question_list)
    }), 200


# DELETE EXAMINATION QUESTION (ADMIN ONLY)
@exam_bp.route("/<exam_id>/questions/<question_id>", methods=["DELETE"])
@jwt_required()
def delete_question(exam_id, question_id):

    claims = get_jwt()

    if claims.get("role") != "admin":
        return jsonify({"message": "Admin access required"}), 403

    if not ObjectId.is_valid(exam_id) or not ObjectId.is_valid(question_id):
        return jsonify({
            "message": "Invalid examination or question ID"
        }), 400

    exam = db.exams.find_one({"_id": ObjectId(exam_id)})

    if not exam:
        return jsonify({"message": "Examination not found"}), 404

    if exam.get("status") != "draft":
        return jsonify({
            "message": "Questions cannot be deleted after publishing"
        }), 400

    result = db.questions.delete_one({
        "_id": ObjectId(question_id),
        "exam_id": ObjectId(exam_id)
    })

    if result.deleted_count == 0:
        return jsonify({"message": "Question not found"}), 404

    db.exams.update_one(
        {"_id": ObjectId(exam_id)},
        {"$inc": {"total_questions": -1}}
    )

    return jsonify({
        "message": "Question deleted successfully"
    }), 200
# ADMIN - PUBLISH EXAMINATION
@exam_bp.route("/<exam_id>/publish", methods=["POST"])
@jwt_required()
def publish_exam(exam_id):

    claims = get_jwt()

    if claims.get("role") != "admin":
        return jsonify({
            "message": "Admin access required"
        }), 403

    if not ObjectId.is_valid(exam_id):
        return jsonify({
            "message": "Invalid examination ID"
        }), 400

    exam = db.exams.find_one({
        "_id": ObjectId(exam_id)
    })

    if not exam:
        return jsonify({
            "message": "Examination not found"
        }), 404

    if exam.get("status") != "draft":
        return jsonify({
            "message": "Examination is already published"
        }), 400

    questions = list(db.questions.find({
        "exam_id": ObjectId(exam_id)
    }))

    if len(questions) != 15:
        return jsonify({
            "message": "Please add exactly 15 questions before publishing."
        }), 400

    if not all(
        question.get("question_type") == "coding"
        for question in questions
    ):
        return jsonify({
            "message": "All 15 questions must be Python coding questions."
        }), 400

    db.exams.update_one(
        {"_id": ObjectId(exam_id)},
        {
            "$set": {
                "status": "published",
                "required_questions": 10,
                "published_at": datetime.now(timezone.utc)
            }
        }
    )

    return jsonify({
        "message": "Examination published successfully!"
    }), 200
# STUDENT - VIEW PUBLISHED EXAMINATIONS
@exam_bp.route("/student/available", methods=["GET"])
@jwt_required()
def get_available_exams():

    claims = get_jwt()

    if claims.get("role") != "student":
        return jsonify({
            "message": "Student access required"
        }), 403

    exams = list(db.exams.find({
        "status": "published"
    }).sort("published_at", -1))

    exam_list = []

    for exam in exams:
        exam_list.append({
            "id": str(exam["_id"]),
            "title": exam.get("title", ""),
            "description": exam.get("description", ""),
            "duration": exam.get("duration", 60),
            "total_questions": exam.get("total_questions", 15),
            "required_questions": exam.get("required_questions", 10)
        })

    return jsonify({
        "exams": exam_list
    }), 200
# STUDENT - VIEW QUESTIONS FOR SELECTION
@exam_bp.route("/student/<exam_id>/questions", methods=["GET"])
@jwt_required()
def get_student_exam_questions(exam_id):

    claims = get_jwt()

    if claims.get("role") != "student":
        return jsonify({
            "message": "Student access required"
        }), 403

    if not ObjectId.is_valid(exam_id):
        return jsonify({
            "message": "Invalid examination ID"
        }), 400

    exam = db.exams.find_one({
        "_id": ObjectId(exam_id),
        "status": "published"
    })

    if not exam:
        return jsonify({
            "message": "Published examination not found"
        }), 404

    questions = list(db.questions.find({
        "exam_id": ObjectId(exam_id)
    }))

    question_list = []

    for index, question in enumerate(questions):

        question_list.append({
            "id": str(question["_id"]),
            "number": index + 1,
            "question": question.get("question", ""),
            "question_type": question.get("question_type", ""),
            "marks": question.get("marks", 0),
            "starter_code": question.get("starter_code", "")
        })

    return jsonify({
        "exam": {
            "id": str(exam["_id"]),
            "title": exam.get("title", ""),
            "duration": exam.get("duration", 60),
            "total_questions": len(question_list),
            "required_questions": 10
        },
        "questions": question_list
    }), 200
    # STUDENT - START EXAMINATION
@exam_bp.route("/student/<exam_id>/start", methods=["POST"])
@jwt_required()
def start_exam(exam_id):

    claims = get_jwt()

    if claims.get("role") != "student":
        return jsonify({"message": "Student access required"}), 403

    if not ObjectId.is_valid(exam_id):
        return jsonify({"message": "Invalid examination ID"}), 400

    student_id = str(get_jwt_identity())

    exam = db.exams.find_one({
        "_id": ObjectId(exam_id),
        "status": "published"
    })

    if not exam:
        return jsonify({"message": "Published examination not found"}), 404

    data = request.get_json() or {}
    question_ids = data.get("selected_questions", [])

    if not isinstance(question_ids, list) or len(question_ids) != 10:
        return jsonify({"message": "Please select exactly 10 questions"}), 400

    if len(set(question_ids)) != 10:
        return jsonify({"message": "Duplicate questions are not allowed"}), 400

    if not all(ObjectId.is_valid(qid) for qid in question_ids):
        return jsonify({"message": "Invalid question ID"}), 400

    existing_attempt = db.exam_attempts.find_one({
        "exam_id": ObjectId(exam_id),
        "student_id": student_id
    })

    if existing_attempt:
        return jsonify({
            "message": "Examination attempt already exists",
            "attempt_id": str(existing_attempt["_id"]),
            "status": existing_attempt["status"]
        }), 200

    valid_questions = list(db.questions.find({
        "_id": {"$in": [ObjectId(qid) for qid in question_ids]},
        "exam_id": ObjectId(exam_id)
    }))

    if len(valid_questions) != 10:
        return jsonify({"message": "Some selected questions are invalid"}), 400

    start_time = datetime.now(timezone.utc)
    end_time = start_time + timedelta(minutes=exam.get("duration", 60))

    attempt = {
        "exam_id": ObjectId(exam_id),
        "student_id": student_id,
        "selected_questions": [ObjectId(qid) for qid in question_ids],
        "answers": {},
        "status": "in_progress",
        "started_at": start_time,
        "end_at": end_time,
        "submitted_at": None
    }

    result = db.exam_attempts.insert_one(attempt)

    return jsonify({
        "message": "Examination started successfully",
        "attempt_id": str(result.inserted_id),
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "duration": exam.get("duration", 60)
    }), 201
    # STUDENT - SAVE EXAMINATION ANSWER
@exam_bp.route("/student/attempt/<attempt_id>/answer", methods=["POST"])
@jwt_required()
def save_exam_answer(attempt_id):

    claims = get_jwt()

    if claims.get("role") != "student":
        return jsonify({
            "message": "Student access required"
        }), 403

    if not ObjectId.is_valid(attempt_id):
        return jsonify({
            "message": "Invalid attempt ID"
        }), 400

    student_id = str(get_jwt_identity())

    attempt = db.exam_attempts.find_one({
        "_id": ObjectId(attempt_id),
        "student_id": student_id
    })

    if not attempt:
        return jsonify({
            "message": "Examination attempt not found"
        }), 404

    if attempt.get("status") != "in_progress":
        return jsonify({
            "message": "This examination is no longer active"
        }), 400

    end_time = attempt["end_at"]

    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) >= end_time:
        db.exam_attempts.update_one(
            {"_id": ObjectId(attempt_id)},
            {
                "$set": {
                    "status": "submitted",
                    "submitted_at": datetime.now(timezone.utc)
                }
            }
        )

        return jsonify({
            "message": "Examination time has expired"
        }), 400

    data = request.get_json() or {}

    question_id = data.get("question_id")
    answer_code = data.get("answer")

    if not ObjectId.is_valid(question_id):
        return jsonify({
            "message": "Invalid question ID"
        }), 400

    if not isinstance(answer_code, str):
        return jsonify({
            "message": "Answer must be text"
        }), 400

    selected_question_ids = [
        str(qid) for qid in attempt["selected_questions"]
    ]

    if question_id not in selected_question_ids:
        return jsonify({
            "message": "This question was not selected for the examination"
        }), 403

    db.exam_attempts.update_one(
        {"_id": ObjectId(attempt_id)},
        {
            "$set": {
                f"answers.{question_id}": answer_code,
                "last_saved_at": datetime.now(timezone.utc)
            }
        }
    )

    return jsonify({
        "message": "Answer saved successfully"
    }), 200

    # Check whether the student already has an attempt
    existing_attempt = db.exam_attempts.find_one({
        "exam_id": ObjectId(exam_id),
        "student_id": str(student_id)
    })

    if existing_attempt:
        return jsonify({
            "message": "Examination attempt already exists",
            "attempt_id": str(existing_attempt["_id"]),
            "status": existing_attempt["status"]
        }), 200

    selected_questions = request.get_json() or {}
    question_ids = selected_questions.get("selected_questions", [])

    if not isinstance(question_ids, list) or len(question_ids) != 10:
        return jsonify({
            "message": "Please select exactly 10 questions"
        }), 400

    if len(set(question_ids)) != 10:
        return jsonify({
            "message": "Duplicate question selection is not allowed"
        }), 400

    if not all(ObjectId.is_valid(qid) for qid in question_ids):
        return jsonify({
            "message": "Invalid question ID"
        }), 400

    # Verify that all selected questions belong to this exam
    valid_questions = list(db.questions.find({
        "_id": {
            "$in": [ObjectId(qid) for qid in question_ids]
        },
        "exam_id": ObjectId(exam_id)
    }))

    if len(valid_questions) != 10:
        return jsonify({
            "message": "Some selected questions are invalid"
        }), 400

    start_time = datetime.now(timezone.utc)
    end_time = start_time + timedelta(
        minutes=exam.get("duration", 60)
    )

    attempt = {
        "exam_id": ObjectId(exam_id),
        "student_id": str(student_id),
        "selected_questions": [
            ObjectId(qid) for qid in question_ids
        ],
        "answers": {},
        "status": "in_progress",
        "started_at": start_time,
        "end_at": end_time,
        "submitted_at": None
    }

    result = db.exam_attempts.insert_one(attempt)

    return jsonify({
        "message": "Examination started successfully",
        "attempt_id": str(result.inserted_id),
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "duration": exam.get("duration", 60)
    }), 201
    
# STUDENT - GET EXAMINATION ATTEMPT
@exam_bp.route("/student/attempt/<attempt_id>", methods=["GET"])
@jwt_required()
def get_exam_attempt(attempt_id):

    claims = get_jwt()

    if claims.get("role") != "student":
        return jsonify({
            "message": "Student access required"
        }), 403

    if not ObjectId.is_valid(attempt_id):
        return jsonify({
            "message": "Invalid attempt ID"
        }), 400

    student_id = str(get_jwt_identity())

    attempt = db.exam_attempts.find_one({
        "_id": ObjectId(attempt_id),
        "student_id": student_id
    })

    if not attempt:
        return jsonify({
            "message": "Examination attempt not found"
        }), 404

    return jsonify({
        "attempt_id": str(attempt["_id"]),
        "exam_id": str(attempt["exam_id"]),
        "status": attempt["status"],
        "selected_questions": [
            str(qid) for qid in attempt["selected_questions"]
        ],
        "answers": attempt.get("answers", {}),
        "started_at": attempt["started_at"].replace(
    tzinfo=timezone.utc
).isoformat(),

"end_at": attempt["end_at"].replace(
    tzinfo=timezone.utc
).isoformat(),
        "last_saved_at": (
            attempt["last_saved_at"].isoformat()
            if attempt.get("last_saved_at") else None
        )
    }), 200
# STUDENT - SUBMIT EXAMINATION
@exam_bp.route("/student/attempt/<attempt_id>/submit", methods=["POST"])
@jwt_required()
def submit_exam(attempt_id):

    claims = get_jwt()

    if claims.get("role") != "student":
        return jsonify({
            "message": "Student access required"
        }), 403

    if not ObjectId.is_valid(attempt_id):
        return jsonify({
            "message": "Invalid attempt ID"
        }), 400

    student_id = str(get_jwt_identity())

    attempt = db.exam_attempts.find_one({
        "_id": ObjectId(attempt_id),
        "student_id": student_id
    })

    if not attempt:
        return jsonify({
            "message": "Examination attempt not found"
        }), 404

    if attempt.get("status") == "submitted":
        return jsonify({
            "message": "Examination already submitted"
        }), 400

    submitted_at = datetime.now(timezone.utc)

    db.exam_attempts.update_one(
        {"_id": ObjectId(attempt_id)},
        {
            "$set": {
                "status": "submitted",
                "submitted_at": submitted_at
            }
        }
    )

    return jsonify({
        "message": "Examination submitted successfully",
        "attempt_id": attempt_id,
        "submitted_at": submitted_at.isoformat(),
        "status": "submitted"
    }), 200
# ADMIN - EXPORT STUDENT EXAMINATION REPORT AS PDF
@exam_bp.route("/admin/reports/pdf", methods=["GET"])
@jwt_required()
def export_student_reports_pdf():

    claims = get_jwt()

    if claims.get("role") != "admin":
        return jsonify({
            "message": "Admin access required"
        }), 403

    pdf_buffer = BytesIO()

    document = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    title_style = styles["Title"]
    heading_style = styles["Heading2"]
    normal_style = styles["Normal"]

    code_style = ParagraphStyle(
        "CodeStyle",
        parent=styles["Code"],
        fontName="Courier",
        fontSize=8,
        leading=10,
        spaceAfter=10
    )

    story = []

    story.append(Paragraph(
        "ExamGuard - Student Examination Reports",
        title_style
    ))

    story.append(Spacer(1, 20))

    attempts = list(
        db.exam_attempts.find().sort("started_at", 1)
    )

    if not attempts:
        story.append(Paragraph(
            "No examination attempts found.",
            normal_style
        ))

    for index, attempt in enumerate(attempts):

        student = db.users.find_one({
            "_id": ObjectId(attempt["student_id"])
        })

        exam = db.exams.find_one({
            "_id": attempt["exam_id"]
        })

        if not student:
            continue

        if index > 0:
            story.append(PageBreak())

        student_name = escape(student.get("name", "Unknown"))
        student_email = escape(student.get("email", "Unknown"))
        exam_title = escape(
            exam.get("title", "Unknown Exam")
            if exam else "Unknown Exam"
        )

        story.append(Paragraph(
            "Student Details",
            heading_style
        ))

        story.append(Paragraph(
            "<b>Name:</b> " + student_name,
            normal_style
        ))

        story.append(Paragraph(
            "<b>Email:</b> " + student_email,
            normal_style
        ))

        story.append(Paragraph(
            "<b>Examination:</b> " + exam_title,
            normal_style
        ))

        story.append(Paragraph(
            "<b>Status:</b> " + escape(
                attempt.get("status", "Unknown")
            ),
            normal_style
        ))

        story.append(Paragraph(
            "<b>Started At:</b> " + escape(
                str(attempt.get("started_at", ""))
            ),
            normal_style
        ))

        story.append(Paragraph(
            "<b>Submitted At:</b> " + escape(
                str(attempt.get("submitted_at") or "Not submitted")
            ),
            normal_style
        ))

        story.append(Spacer(1, 15))

        story.append(Paragraph(
            "Student Answers and Python Code",
            heading_style
        ))

        answers = attempt.get("answers", {})

        selected_questions = attempt.get(
            "selected_questions", []
        )

        for question_number, question_id in enumerate(
            selected_questions, start=1
        ):

            question = db.questions.find_one({
                "_id": question_id
            })

            if not question:
                continue

            question_text = escape(
                question.get("question", "Question unavailable")
            )

            answer_code = answers.get(
                str(question_id),
                "No answer submitted"
            )

            story.append(Paragraph(
                "<b>Question " + str(question_number) + ":</b>",
                normal_style
            ))

            story.append(Paragraph(
                question_text,
                normal_style
            ))

            story.append(Spacer(1, 5))

            story.append(Preformatted(
                escape(str(answer_code)),
                code_style
            ))

            story.append(Spacer(1, 10))

    document.build(story)

    pdf_buffer.seek(0)

    return send_file(
        pdf_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name="ExamGuard_Student_Reports.pdf"
    )
# STUDENT - RECORD ANTI-CHEATING VIOLATION
@exam_bp.route(
    "/student/attempt/<attempt_id>/violation",
    methods=["POST"]
)
@jwt_required()
def record_violation(attempt_id):

    claims = get_jwt()

    if claims.get("role") != "student":
        return jsonify({
            "message": "Student access required"
        }), 403

    if not ObjectId.is_valid(attempt_id):
        return jsonify({
            "message": "Invalid attempt ID"
        }), 400

    student_id = str(get_jwt_identity())

    attempt = db.exam_attempts.find_one({
        "_id": ObjectId(attempt_id),
        "student_id": student_id
    })

    if not attempt:
        return jsonify({
            "message": "Examination attempt not found"
        }), 404

    if attempt.get("status") != "in_progress":
        return jsonify({
            "message": "Examination is no longer active"
        }), 400

    data = request.get_json() or {}
    violation_type = data.get("violation_type", "unknown")

    allowed_types = [
        "tab_switch",
        "window_blur",
        "fullscreen_exit"
    ]

    if violation_type not in allowed_types:
        return jsonify({
            "message": "Invalid violation type"
        }), 400

    violation = {
        "type": violation_type,
        "timestamp": datetime.now(timezone.utc)
    }

    db.exam_attempts.update_one(
        {"_id": ObjectId(attempt_id)},
        {
            "$inc": {"violation_count": 1},
            "$push": {"violations": violation}
        }
    )

    updated_attempt = db.exam_attempts.find_one({
        "_id": ObjectId(attempt_id)
    })

    violation_count = updated_attempt.get(
        "violation_count", 0
    )

    return jsonify({
        "message": "Violation recorded",
        "violation_count": violation_count,
        "remaining_warnings": max(0, 4 - violation_count),
        "auto_submit_required": violation_count >= 4
    }), 200