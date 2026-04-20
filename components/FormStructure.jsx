  import React, { useState, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import withAuth from "@/components/withAuth";

const TreeNode = ({ node, level, toggleNode, isNodeOpen, handleNodeClick }) => {
  const [isFullTextVisible, setIsFullTextVisible] = useState(false);

  const truncateText = (text, maxLength) => {
    if (!text) return "";
    if (text.length > maxLength) {
      const truncated = text.substring(0, maxLength);
      const lastSpaceIndex = truncated.lastIndexOf(" ");
      return lastSpaceIndex !== -1
        ? `${truncated.substring(0, lastSpaceIndex)}...`
        : `${truncated}...`;
    }
    return text;
  };

  const handleClick = () => {
    try {
      if (["form", "section", "subsection"].includes(node.type)) {
        toggleNode(node.uniqueId);
      }
      handleNodeClick(node);
    } catch (error) {
      console.error(`Error in handleClick for node: ${node.uniqueId}`, error);
    }
  };

  const handleDoubleClick = () => {
    setIsFullTextVisible((prev) => !prev);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const getHeaderColor = (type) => {
    switch (type) {
      case "form":
        return "var(--brand-primary)";
      case "header":
      case "footer":
        return "#01299B";
      case "section":
        return "hsl(var(--primary))f7";
      case "subsection":
        return "var(--brand-secondary)";
      default:
        return "var(--brand-secondary)";
    }
  };

  return (
    <li style={{ marginBottom: node.type === "form" ? "0px" : "2px" }}>
      {["form", "header", "footer", "section", "subsection"].includes(node.type) && (
        <div
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onKeyDown={handleKeyDown}
          style={{
            cursor: "pointer",
            color: getHeaderColor(node.type),
            fontWeight: "bold",
            fontSize: node.type === "form" ? "16px" : "15px",
            padding: "3px 4px",
            display: "flex",
            alignItems: "center",
            flexWrap: node.type === "header" || node.type === "footer" ? "nowrap" : "wrap",
            wordBreak: "break-word",
            whiteSpace: "normal",
            maxWidth: "100%",
            transition: "background-color 0.3s ease",
            fontFamily: "Arial, sans-serif",
            backgroundColor:
              node.type === "form"
                ? "rgba(26, 118, 209, 0.05)"
                : node.type === "section"
                ? "rgba(1, 42, 155, 0.05)"
                : "transparent",
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor =
              node.type === "form"
                ? "rgba(26, 118, 209, 0.1)"
                : node.type === "section"
                ? "rgba(1, 42, 155, 0.1)"
                : "rgba(0, 0, 0, 0.05)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor =
              node.type === "form"
                ? "rgba(26, 118, 209, 0.05)"
                : node.type === "section"
                ? "rgba(1, 42, 155, 0.05)"
                : "transparent";
          }}
          tabIndex={0}
          role="button"
          aria-expanded={isNodeOpen(node.uniqueId)}
          aria-label={node.label || "Form Structure"}
        >
          {node.type !== "header" && node.type !== "footer" && (
            <span
              style={{
                marginRight: "6px",
                fontSize: "12px",
                color: getHeaderColor(node.type),
              }}
              aria-hidden="true"
            >
              {isNodeOpen(node.uniqueId) ? "▼" : "▶"}
            </span>
          )}
          <span
            style={{
              wordBreak: "break-word",
              whiteSpace: "normal",
              maxWidth: "100%",
            }}
          >
            {isFullTextVisible
              ? node.label
              : truncateText(node.label || "Form Structure", 45)}
          </span>
        </div>
      )}

      {node.type === "question" && (
        <div
          onClick={() => handleNodeClick(node)}
          onDoubleClick={handleDoubleClick}
          onKeyDown={handleKeyDown}
          style={{
            fontSize: "14px",
            color: "var(--brand-secondary)",
            padding: "3px 4px 3px 20px",
            cursor: "pointer",
            wordBreak: "break-word",
            whiteSpace: "normal",
            maxWidth: "100%",
            transition: "background-color 0.3s ease",
            fontFamily: "Arial, sans-serif",
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "transparent";
          }}
          tabIndex={0}
          role="button"
          aria-label={node.label}
        >
          {isFullTextVisible ? node.label : truncateText(node.label, 45)}
        </div>
      )}

      {["form", "section", "subsection"].includes(node.type) &&
        node.children?.length > 0 && (
          <ul
            style={{
              listStyleType: "none",
              paddingLeft: "0",
              marginLeft: "0",
              maxHeight: isNodeOpen(node.uniqueId) ? "1000px" : "0",
              overflow: "hidden",
              transition: "max-height 0.3s ease",
            }}
            role="group"
          >
            {node.children.map((childNode) => (
              <TreeNode
                key={childNode.uniqueId}
                node={childNode}
                level={level + 1}
                toggleNode={toggleNode}
                isNodeOpen={isNodeOpen}
                handleNodeClick={handleNodeClick}
              />
            ))}
          </ul>
        )}
    </li>
  );
};

TreeNode.propTypes = {
  node: PropTypes.shape({
    uniqueId: PropTypes.string.isRequired,
    label: PropTypes.string,
    type: PropTypes.oneOf([
      "form",
      "header",
      "footer",
      "section",
      "subsection",
      "question",
    ]).isRequired,
    children: PropTypes.array,
  }).isRequired,
  level: PropTypes.number.isRequired,
  toggleNode: PropTypes.func.isRequired,
  isNodeOpen: PropTypes.func.isRequired,
  handleNodeClick: PropTypes.func.isRequired,
};

const Tree = ({
  formName,
  sections,
  header,
  footer,
  showQuestions = true,
  showHeaderFooter = true,
}) => {
  const [openNodes, setOpenNodes] = useState(["form", "0"]); // Open form and first section by default
  const formRef = useRef(null);

  const toggleNode = (uniqueId) => {
    try {
      setOpenNodes((prev) =>
        prev.includes(uniqueId)
          ? prev.filter((id) => id !== uniqueId)
          : [...prev, uniqueId]
      );
    } catch (error) {
      console.error(`Error in toggleNode for uniqueId: ${uniqueId}`, error);
    }
  };

  const isNodeOpen = (uniqueId) => openNodes.includes(uniqueId);

  const handleNodeClick = (node) => {
    try {
      let targetElement;
      const ids = node.uniqueId.split("-");

      switch (node.type) {
        case "form":
          targetElement = document.getElementById("form");
          break;
        case "header":
          targetElement = document.getElementById("header");
          break;
        case "footer":
          targetElement = document.getElementById("footer");
          break;
        case "section":
          targetElement = document.getElementById(`section-${ids[1]}`);
          break;
        case "subsection":
          targetElement = document.getElementById(`subsection-${ids[1]}-${ids[2]}`);
          break;
        case "question":
          targetElement = document.getElementById(`question-${ids[1]}-${ids[2]}-${ids[3]}`);
          break;
        default:
          return;
      }

      if (!targetElement) {
        console.warn(`Target element not found for ${node.uniqueId}`);
        return;
      }

      const rect = targetElement.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;
      const viewportWidth =
        window.innerWidth || document.documentElement.clientWidth;

      const isInViewport =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= viewportHeight &&
        rect.right <= viewportWidth;

      if (!isInViewport) {
        let blockOption = "nearest";
        if (node.type === "section") {
          blockOption = targetElement.nextElementSibling ? "start" : "center";
        } else if (rect.top < 0) {
          blockOption = "start";
        } else if (rect.bottom > viewportHeight) {
          blockOption = "end";
        }
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: blockOption,
          inline: "nearest",
        });
      }

      setTimeout(() => {
        try {
          targetElement.focus({ preventScroll: true });
        } catch (focusError) {
          console.warn(`Focus failed for ${node.uniqueId}: ${focusError}`);
        }
      }, 1000);
    } catch (error) {
      console.error(`Error in handleNodeClick for ${node.uniqueId}: ${error}`);
    }
  };

  const renderTreeStructure = (nodes, level = 0, parentId = "") => {
    try {
      if (!Array.isArray(nodes)) {
        console.warn("Nodes is not an array:", nodes);
        return [];
      }

      return nodes.map((node, index) => {
        const uniqueId = parentId ? `${parentId}-${index}` : `${index}`;
        return {
          uniqueId,
          label: node.sectionDetails || node.subsectionDetails || node.question,
          value: node.section || node.subsection || node.question,
          type: node.sectionDetails
            ? "section"
            : node.subsectionDetails
            ? "subsection"
            : "question",
          children: node.subsections
            ? renderTreeStructure(node.subsections, level + 1, uniqueId)
            : showQuestions && node.questions
            ? node.questions.map((q, qIndex) => ({
                uniqueId: `${uniqueId}-${qIndex}`,
                label: q.question,
                value: q.question,
                type: "question",
              }))
            : [],
        };
      });
    } catch (error) {
      console.error("Error in renderTreeStructure:", error);
      return [];
    }
  };

  const treeData = useMemo(() => {
    try {
      const headerName = header?.name || "Details";
      const footerName = footer?.name || "Summary";
      const sectionsTree = renderTreeStructure(sections || [], 0, "form");
      return [
        {
          uniqueId: "form",
          label: formName || "Untitled Form",
          type: "form",
          children: showHeaderFooter
            ? [
                { uniqueId: "header", label: headerName, type: "header" },
                ...sectionsTree,
                { uniqueId: "footer", label: footerName, type: "footer" },
              ]
            : sectionsTree,
        },
      ];
    } catch (error) {
      console.error("Error in treeData memoization:", error);
      return [];
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formName, sections, header, footer, showQuestions, showHeaderFooter]);

  return (
    <div
      ref={formRef}
      style={{
        fontFamily: "Arial, sans-serif",
        padding: "4px",
        backgroundColor: "#ffffff",
        borderRadius: "4px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        width: "100%",
        height: "83vh",
        overflowY: "auto",
        overflowX: "hidden",
        scrollbarWidth: "thin",
        scrollbarColor: "#888 #ffffff",
      }}
    >
      <style>
        {`
          div::-webkit-scrollbar {
            width: 6px;
          }
          div::-webkit-scrollbar-track {
            background: #ffffff;
          }
          div::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 4px;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: var(--brand-primary);
          }
        `}
      </style>
      <ul
        style={{
          listStyleType: "none",
          paddingLeft: "0",
          margin: "0",
        }}
        role="tree"
        aria-label="Form Structure"
      >
        {treeData.map((node) => (
          <TreeNode
            key={node.uniqueId}
            node={node}
            level={0}
            toggleNode={toggleNode}
            isNodeOpen={isNodeOpen}
            handleNodeClick={handleNodeClick}
          />
        ))}
      </ul>
    </div>
  );
};

Tree.propTypes = {
  formName: PropTypes.string,
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      sectionDetails: PropTypes.string,
      subsectionDetails: PropTypes.string,
      question: PropTypes.string,
      section: PropTypes.string,
      subsection: PropTypes.string,
      subsections: PropTypes.array,
      questions: PropTypes.arrayOf(
        PropTypes.shape({
          question: PropTypes.string,
        })
      ),
    })
  ),
  header: PropTypes.shape({
    name: PropTypes.string,
  }),
  footer: PropTypes.shape({
    name: PropTypes.string,
  }),
  showQuestions: PropTypes.bool,
  showHeaderFooter: PropTypes.bool,
};

export default withAuth(Tree);