"use client";
import React, { useState, useEffect } from "react";
import "./Styles/FormPreview.css";
//import { SaveForms, UpdateDraftForm } from '@/app/actions/form.actions';
import { CgCloseR } from "react-icons/cg";
import { useRouter } from "next/navigation";
import withAuth from "@/components/withAuth";

const DraftForm = ({
  sections,
  formName,
  formDescription,
  formId,
  rowId,
  onSubmitSuccess,
}) => {
  const [draftResponses, setDraftResponses] = useState({});
  const [message, setMessage] = useState("");
  const [sectionsState, setSectionsState] = useState(sections);

  const router = useRouter();

  useEffect(() => {
    const initializeDraftResponses = () => {
      const initialResponses = {};
      sections.forEach((section, sIndex) => {
        section.questions.forEach((question, qIndex) => {
          const questionId = `${sIndex}-${qIndex}`;
          initialResponses[questionId] = question.answer || "";

          if (question.subQuestions) {
            question.subQuestions.forEach((_, subIndex) => {
              const subQuestionId = `${questionId}-${subIndex}`;
              initialResponses[subQuestionId] = question.answer || "";
            });
          }
        });
        if (section.subsections) {
          section.subsections.forEach((subsection, subIndex) => {
            subsection.questions.forEach((question, qIndex) => {
              const subQuestionId = `${sIndex}-${subIndex}-${qIndex}`;
              initialResponses[subQuestionId] = question.answer || "";

              if (question.subQuestions) {
                question.subQuestions.forEach((_, subSubIndex) => {
                  const subSubQuestionId = `${subQuestionId}-${subSubIndex}`;
                  initialResponses[subSubQuestionId] = question.answer || "";
                });
              }
            });
          });
        }
      });
      setDraftResponses(initialResponses);
    };

    initializeDraftResponses();
  }, [sections]);

  const handleResponseChange = (e, questionId, type) => {
    const { value, checked } = e.target;
    setDraftResponses((prevResponses) => {
      const newResponses = { ...prevResponses };

      if (type === "radio" || type === "dropdown") {
        newResponses[questionId] = value;
      } else if (type === "checkboxes") {
        if (checked) {
          const updated = [...(prevResponses[questionId] || [])];
          updated.push(value);
          newResponses[questionId] = updated;
        } else {
          const updated = (prevResponses[questionId] || []).filter(
            (item) => item !== value
          );
          newResponses[questionId] = updated;
        }
      } else {
        newResponses[questionId] = value;
      }

      // Recalculate score and update sectionsState
      const updatedSections = sections.map((section, sIndex) => {
        const baseIndex = `${sIndex}`;
        return {
          ...section,
          sectionScore: calculateScore(
            section.questions,
            baseIndex,
            section.subsections
          ),
          subsections: section.subsections?.map((subsection, subIndex) => ({
            ...subsection,
            subsectionScore: calculateScore(
              subsection.questions,
              `${baseIndex}-${subIndex}`,
              subsection.subsections
            ),
          })),
        };
      });

      setSectionsState(updatedSections);
      return newResponses;
    });
  };

  const handleRadioChange = (questionId, value) => {
    setDraftResponses((prevResponses) => {
      const newResponses = {
        ...prevResponses,
        [questionId]: value,
      };

      // Recalculate score and update sectionsState
      const updatedSections = sections.map((section, sIndex) => {
        const baseIndex = `${sIndex}`;
        return {
          ...section,
          sectionScore: calculateScore(
            section.questions,
            baseIndex,
            section.subsections
          ),
          subsections: section.subsections?.map((subsection, subIndex) => ({
            ...subsection,
            subsectionScore: calculateScore(
              subsection.questions,
              `${baseIndex}-${subIndex}`,
              subsection.subsections
            ),
          })),
        };
      });

      setSectionsState(updatedSections);
      return newResponses;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const formData = {
        formId,
        rowId,
        formName,
        formDescription,
        sections: sectionsState, // Include the updated sections with scores
        responses: draftResponses, // Include the user responses
      };
      //await UpdateDraftForm(rowId, formId, formData);

      setMessage("Draft updated successfully!");
      onSubmitSuccess();
      // setTimeout(() => {
      //   router.back();
      // }, 2000);
    } catch (error) {
      console.error("Error updating draft:", error);
      setMessage("Error updating draft.");
    }
  };

  const calculateScore = (questions, baseIndex, subsections = []) => {
    let score = 0;

    questions.forEach((question, qIndex) => {
      const questionId = `${baseIndex}-${qIndex}`;

      switch (question.type) {
        case "multipleChoice": {
          const selectedOption = draftResponses[questionId];
          if (selectedOption !== undefined) {
            const optionIndex = question.options.indexOf(selectedOption);
            score += Number(question.scores[optionIndex]) || 0;
          }
          break;
        }

        case "checkboxes": {
          question.options.forEach((option, oIndex) => {
            const optionId = `${questionId}-${oIndex}`;
            if (
              draftResponses[optionId] &&
              draftResponses[optionId].includes(option)
            ) {
              score += Number(question.scores[oIndex]) || 0;
            }
          });
          break;
        }

        case "dropdown": {
          const selectedOptionIndex = draftResponses[questionId];
          if (selectedOptionIndex !== undefined) {
            score += Number(question.scores[selectedOptionIndex]) || 0;
          }
          break;
        }

        case "shortAnswer":
        case "paragraph":
          // No score calculation for these types
          break;

        default:
          console.warn(`Unknown question type: ${question.type}`);
      }
    });

    // Calculate score for each subsection
    subsections.forEach((subsection, subIndex) => {
      const subsectionScore = calculateScore(
        subsection.questions,
        `${baseIndex}-${subIndex}`,
        subsection.subsections
      );
      score += subsectionScore;
    });

    return score;
  };

  const handleCancel = () => {
    router.push();
  };

  return (
    <div className="form-previewer">
      <div className="form-header">
        <button className="close-button" onClick={handleCancel}>
          <CgCloseR />
        </button>
      </div>
      <div className="form-details">
        <h3>{formName || "Form Name Not Provided"}</h3>
        <p>{formDescription}</p>
      </div>
      <div className="totalform-score">
        <h4>
          {sections.reduce(
            (acc, section, sIndex) =>
              acc +
              calculateScore(
                section.questions,
                `${sIndex}`,
                section.subsections
              ),
            0
          )}
        </h4>
      </div>
      <form onSubmit={handleSubmit}>
        {sections.map((section, sIndex) => {
          const sectionScore = calculateScore(
            section.questions,
            `${sIndex}`,
            section.subsections
          );
          return (
            <div key={section.id} className="preview-section">
              <h3>
                {section.sectionDetails || "Section Details Not Provided"}
              </h3>
              <p>{section.sectionDescription}</p>
              <input
                type="hidden"
                name={`section-${sIndex}-details`}
                value={section.sectionDetails | ""}
              />
              <input
                type="hidden"
                name={`section-${sIndex}-description`}
                value={section.sectionDescription || ""}
              />
              {/* {renderSectionScore(section)} */}
              {section.subsections &&
                section.subsections.map((subsection, subIndex) => {
                  const subsectionScore = calculateScore(
                    subsection.questions,
                    `${sIndex}-${subIndex}`
                  );
                  return (
                    <div key={subsection.id} className="preview-subsection">
                      <h4>
                        {subsection.subsectionDetails ||
                          "Subsection Title Not Provided"}
                      </h4>
                      <p>{subsection.subsectionDescription}</p>
                      <input
                        type="hidden"
                        name={`section-${sIndex}-subsection-${subIndex}-details`}
                        value={subsection.subsectionDetails || ""}
                      />
                      <input
                        type="hidden"
                        name={`section-${sIndex}-subsection-${subIndex}-description`}
                        value={subsection.subsectionDescription || ""}
                      />
                      {/* {renderSubsectionScore(subsection)} */}
                      {subsection.questions.map((question, qIndex) => (
                        <div key={question.id} className="preview-question">
                          <p className="question-number">{qIndex + 1}.</p>
                          <p className="question-text">
                            {question.question || "Question Not Provided"}
                            {question.required && (
                              <span className="required-indicator">*</span>
                            )}
                          </p>
                          {renderQuestionInput(
                            question,
                            sIndex,
                            subIndex,
                            qIndex
                          )}
                        </div>
                      ))}
                      <div className="subsection-score">
                        <h4>{subsectionScore}</h4>
                      </div>
                    </div>
                  );
                })}

              {section.questions.map((question, qIndex) => (
                <div key={question.id} className="preview-question">
                  <p className="question-number">{qIndex + 1}.</p>
                  <p className="question-text">
                    {question.question || "Question Not Provided"}
                    {question.required && (
                      <span className="required-indicator">*</span>
                    )}
                  </p>
                  {renderQuestionInput(question, sIndex, undefined, qIndex)}
                </div>
              ))}
              <div className="section-score">
                <h4>{sectionScore}</h4>
              </div>
            </div>
          );
        })}
        <div className="form-previewer-footer">
          <button type="submit" className="submit-button">
            Update Draft
          </button>
          <button
            className="cancel-button"
            type="button"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      </form>
      {message && <p>{message}</p>}
    </div>
  );

  function renderQuestionInput(question, sIndex, subIndex, qIndex) {
    const questionId =
      subIndex !== undefined
        ? `${sIndex}-${subIndex}-${qIndex}`
        : `${sIndex}-${qIndex}`;
    switch (question.type) {
      case "shortAnswer":
        return (
          <input
            type="text"
            name={`section-${sIndex}-question-${qIndex}-${question.question}-${question.type}`}
            placeholder="Your answer here"
            className="preview-input"
            value={draftResponses[questionId] || ""}
            onChange={(e) => handleResponseChange(e, questionId, "text")}
          />
        );
      case "paragraph":
        return (
          <textarea
            name={`section-${sIndex}-question-${qIndex}-${question.type}`}
            placeholder="Your answer here"
            rows={4}
            className="preview-textarea"
            value={draftResponses[questionId] || ""}
            onChange={(e) => handleResponseChange(e, questionId, "text")}
          />
        );
      case "multipleChoice":
        return (
          <div className="preview-options">
            {Array.isArray(question.options) &&
              question.options.map((option, oIndex) => (
                <div key={oIndex} className="preview-option">
                  <label>
                    <input
                      type="radio"
                      name={`section-${sIndex}-question-${qIndex}-${question.type}`}
                      value={option}
                      checked={draftResponses[questionId] === option}
                      onChange={() => handleRadioChange(questionId, option)}
                    />
                    {option}
                  </label>
                </div>
              ))}
          </div>
        );
      case "checkboxes":
        return (
          <div className="preview-options">
            {Array.isArray(question.options) &&
              question.options.map((option, oIndex) => (
                <div key={oIndex} className="preview-option">
                  <label>
                    <input
                      type="checkbox"
                      name={`section-${sIndex}-question-${qIndex}-${question.type}`}
                      value={option}
                      checked={
                        draftResponses[questionId]?.includes(option) || false
                      }
                      onChange={(e) =>
                        handleResponseChange(e, questionId, "checkboxes")
                      }
                    />
                    {option}
                  </label>
                </div>
              ))}
          </div>
        );
      case "dropdown":
        return (
          <select
            name={`section-${sIndex}-question-${qIndex}-${question.type}`}
            className="preview-select"
            value={draftResponses[questionId] || ""}
            onChange={(e) => handleResponseChange(e, questionId, "dropdown")}
          >
            <option value="">Select an option</option>
            {Array.isArray(question.options) &&
              question.options.map((option, oIndex) => (
                <option key={oIndex} value={option}>
                  {option}
                </option>
              ))}
          </select>
        );
      default:
        return null;
    }
  }
};

export default withAuth(DraftForm);
