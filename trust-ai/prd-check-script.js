/**
 * Custom evaluation script for promptfoo
 * Called directly from promptfooconfig.yaml using: file://eval-script.js:functionName
 *
 * Each function receives (output, context) where output is the LLM response string.
 * Functions must return a boolean, number, or { pass, score, reason } object.
 */

const expectedPRDSections = [
  'Executive Summary',
  'Problem Statement',
  'Objectives',
  'Scope',
  'User Stories',
  'Acceptance Criteria',
  'Non-Functional Requirements',
  'Dependencies',
  'Risks',
  'Success Metrics'
];

const formatThreshold = 0.7;
/**
 * Check if the response has proper PRD format
 */
function hasPrdFormat(output) {
  
   
const foundSections = expectedPRDSections.filter(section => {
  return _createHeadingPattern(section).test(output);
});

    const score = (expectedPRDSections.length - foundSections.length) / expectedPRDSections.length;
    const passing = score > formatThreshold;

    return {
        pass: passing,
        score: score,
        reason: passing ? 'PRD format detected' : `Missing sections: ${expectedPRDSections.filter(s => !foundSections.includes(s)).join(', ')}`
    };

}

 function _createHeadingPattern(section) {
  return new RegExp(`^#+\\s+${section}`, 'm');
}

function _getHeadingLevel(headingText) {
  const match = headingText.match(/^#+/);
  return match ? match[0].length : 2;
}

function _extractSection(output, section) {
  const pattern = _createHeadingPattern(section);
  const match = output.match(pattern);
  
  if (!match) 
    return null;

  const startOfSection = match.index + match[0].length;

  // Find the next heading at the same level or higher
  const headingLevel = _getHeadingLevel(match[0]);
  
  const nextHeadingPattern = new RegExp(`^${'#'.repeat(headingLevel)}\\s+`, 'm');
  const nextHeadingMatch = output.substring(startOfSection).match(nextHeadingPattern);
  
  const endOfSection = nextHeadingMatch ? startOfSection + nextHeadingMatch.index : -1;
  
  return output.substring(startOfSection, endOfSection === -1 ? output.length : endOfSection).trim();
}

function hasSufficientFunctionalRequirements(output, context) {
    const maxFunctionalRequirements = context.vars.max_functional_requirements; // Map from promptfoo config
    if (!maxFunctionalRequirements) {
        return {
            pass: false,
            score: 0,
            reason: 'max_functional_requirements not specified in context'
        };
    }

    let section = '';
    try{
       section = _extractSection(output, 'Functional Requirements');
    } catch (error) {
        return {
            pass: false,
            score: 0,
            reason: 'Error extracting Functional Requirements section: ' + error.message
        };
    }
    if (!section) {
        return {
            pass: false,
            score: 0,
            reason: 'Functional Requirements section not found'
        };
    }

    let numberOfRequirements = 0;
    try{
        const functionalRequirementsHeadingPattern = _createHeadingPattern('Functional Requirements');
        const functionalRequirementsMatch = output.match(functionalRequirementsHeadingPattern);
        const functionalRequirementsHeadingLevel = functionalRequirementsMatch ? _getHeadingLevel(functionalRequirementsMatch[0]) : 2;
        const subheadingPattern = new RegExp(`^${'#'.repeat(functionalRequirementsHeadingLevel + 1)}\\s+`, 'gm');
        
        const subheadingMatches = section.match(subheadingPattern);
        numberOfRequirements = subheadingMatches ? subheadingMatches.length : 0;
    } catch (error) {
        return {
            pass: false,
            score: 0,
            reason: 'Error counting functional requirements: ' + error.message
        };
    }

    const passing = numberOfRequirements <= maxFunctionalRequirements;
    return {
        pass: passing,
        score: passing ? 100 : 0,
        reason: passing ? 'Sufficient functional requirements' : `Insufficient functional requirements: Found ${numberOfRequirements} Functional requirements, expected at most ${maxFunctionalRequirements}`
    };
}

module.exports = { hasPrdFormat, hasSufficientFunctionalRequirements };
