import { useState, useEffect, useRef } from 'react';

const ValidationImpact = () => {
  const [animatedMetrics, setAnimatedMetrics] = useState({
    interviews: 0,
    traditions: 0,
    crossRef: 0,
    relationships: 0,
    confidence: 0
  });

  const targetMetrics = {
    interviews: 147,
    traditions: 42,
    crossRef: 89,
    relationships: 236,
    confidence: 94
  };

  useEffect(() => {
    // Animate metrics on component mount
    const duration = 2000;
    const steps = 60;
    const increment = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      const progress = current / steps;
      
      setAnimatedMetrics({
        interviews: Math.floor(targetMetrics.interviews * progress),
        traditions: Math.floor(targetMetrics.traditions * progress),
        crossRef: Math.floor(targetMetrics.crossRef * progress),
        relationships: Math.floor(targetMetrics.relationships * progress),
        confidence: Math.floor(targetMetrics.confidence * progress)
      });

      if (current >= steps) {
        clearInterval(timer);
        setAnimatedMetrics(targetMetrics);
      }
    }, increment);

    return () => clearInterval(timer);
  }, []);

  const validationSteps = [
    {
      step: 1,
      title: 'Capture',
      description: 'AI-guided interview records experiential knowledge.',
      icon: '🎙',
      details: [
        'Structured conversation protocols',
        'Context-aware questioning',
        'Multi-modal data capture',
        'Ethical consent management'
      ]
    },
    {
      step: 2,
      title: 'Structuring',
      description: 'Information categorized into standardized framework.',
      icon: '📋',
      details: [
        'Materials & Techniques',
        'Process & Tools',
        'Cultural Context',
        'Sustainability Indicators',
        'Risk Factors & Preservation'
      ]
    },
    {
      step: 3,
      title: 'Cross-Verification',
      description: 'Multi-source validation ensures accuracy.',
      icon: '✅',
      details: [
        'Community review processes',
        'Multiple interview comparison',
        'Historical documentation reference',
        'Pattern consistency validation'
      ]
    },
    {
      step: 4,
      title: 'Knowledge Graph Integration',
      description: 'Validated knowledge connected across domains.',
      icon: '🔗',
      details: [
        'Cross-domain relationship mapping',
        'Dependency visualization',
        'Impact pathway analysis',
        'SDG alignment tracking'
      ]
    }
  ];

  const sdgImpacts = [
    {
      sdg: 4,
      title: 'Quality Education',
      description: 'Transforming experiential knowledge into explainable, structured learning modules.',
      metrics: [
        '18 structured learning pathways',
        '42 technique modules created',
        'Apprentice-level accessibility'
      ],
      color: '#C5192D'
    },
    {
      sdg: 10,
      title: 'Reduced Inequalities',
      description: 'Capturing and amplifying marginalized and undocumented community voices.',
      metrics: [
        '12 tribal communities documented',
        '8 endangered traditions preserved',
        '3 linguistic contexts supported'
      ],
      color: '#DDA63A'
    },
    {
      sdg: 11,
      title: 'Sustainable Communities',
      description: 'Preserving climate-resilient and culturally embedded local systems.',
      metrics: [
        '24 climate-resilient practices',
        '15 ecological knowledge systems',
        '6 sustainable material cycles'
      ],
      color: '#F99D26'
    },
    {
      sdg: 16,
      title: 'Strong Institutions',
      description: 'Providing traceable, transparent cultural knowledge infrastructure.',
      metrics: [
        'Institutional archive ready',
        'Policy framework alignment',
        'Transparent governance model'
      ],
      color: '#02689D'
    }
  ];

  const impactPathways = [
    {
      pathway: 'Elder Interview → Structured Module → AI Tutor → Learner Skill Development',
      impact: 'Knowledge Transmission',
      beneficiaries: '500+ learners',
      confidence: '92%'
    },
    {
      pathway: 'Tribal Agroforestry → Sustainability Mapping → Policy Insight → Climate Resilience Support',
      impact: 'Climate Adaptation',
      beneficiaries: '8 communities',
      confidence: '87%'
    },
    {
      pathway: 'Palm Leaf Manuscripts → Digital Structuring → Institutional Archive → Cultural Preservation',
      impact: 'Heritage Conservation',
      beneficiaries: 'National archives',
      confidence: '95%'
    },
    {
      pathway: 'Craft Techniques → Market Analysis → Economic Opportunity → Sustainable Livelihoods',
      impact: 'Economic Empowerment',
      beneficiaries: '150+ artisans',
      confidence: '78%'
    }
  ];

  const traceabilityItems = [
    'Interview timestamp & location',
    'Community reference & consent',
    'Validation stage & status',
    'Related visual analysis',
    'Linked graph nodes',
    'Confidence score calculation',
    'Cross-reference verification',
    'SDG impact assessment'
  ];

  return (
    <div className="validation-impact">
      {/* Header */}
      <div className="vi-header">
        <h1>Validation & Impact – From Oral Wisdom to Structured Intelligence</h1>
        <p>Ensuring accuracy, traceability, and measurable cultural impact.</p>
      </div>

      {/* Validation Framework */}
      <section className="validation-framework">
        <h2>Knowledge Validation Framework</h2>
        <div className="validation-flow">
          {validationSteps.map((step, index) => (
            <div key={step.step} className="validation-step">
              <div className="step-header">
                <div className="step-number">{step.step}</div>
                <div className="step-icon">{step.icon}</div>
                <h3>{step.title}</h3>
              </div>
              <p className="step-description">{step.description}</p>
              <ul className="step-details">
                {step.details.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
              {index < validationSteps.length - 1 && (
                <div className="step-arrow">→</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Validation Metrics */}
      <section className="validation-metrics">
        <h2>Validation Metrics Dashboard</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">{animatedMetrics.interviews}</div>
            <div className="metric-label">Interviews Conducted</div>
            <div className="metric-sublabel">Across 12 districts</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{animatedMetrics.traditions}</div>
            <div className="metric-label">Traditions Documented</div>
            <div className="metric-sublabel">6 knowledge domains</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{animatedMetrics.crossRef}</div>
            <div className="metric-label">Cross-Referenced Entries</div>
            <div className="metric-sublabel">Multi-source validation</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{animatedMetrics.relationships}</div>
            <div className="metric-label">Graph Relationships Mapped</div>
            <div className="metric-sublabel">Cross-domain connections</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{animatedMetrics.confidence}%</div>
            <div className="metric-label">Confidence Index</div>
            <div className="metric-sublabel">Overall accuracy score</div>
          </div>
        </div>
      </section>

      {/* SDG Impact */}
      <section className="sdg-impact">
        <h2>Sustainable Development Impact</h2>
        <div className="sdg-cards">
          {sdgImpacts.map((sdg) => (
            <div key={sdg.sdg} className="sdg-card">
              <div className="sdg-header">
                <div className="sdg-number" style={{ backgroundColor: sdg.color }}>
                  SDG {sdg.sdg}
                </div>
                <h3>{sdg.title}</h3>
              </div>
              <p className="sdg-description">{sdg.description}</p>
              <div className="sdg-metrics">
                {sdg.metrics.map((metric, idx) => (
                  <div key={idx} className="sdg-metric">
                    <span className="metric-bullet">•</span>
                    {metric}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Impact Pathways */}
      <section className="impact-pathways">
        <h2>Real-World Outcome Visualization</h2>
        <div className="pathway-container">
          {impactPathways.map((pathway, index) => (
            <div key={index} className="pathway-card">
              <div className="pathway-flow">
                <div className="pathway-text">{pathway.pathway}</div>
              </div>
              <div className="pathway-impact">
                <div className="impact-label">Impact: {pathway.impact}</div>
                <div className="beneficiaries">Beneficiaries: {pathway.beneficiaries}</div>
                <div className="confidence">Confidence: {pathway.confidence}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Transparency Panel */}
      <section className="transparency-panel">
        <h2>Traceability & Source Transparency</h2>
        <div className="transparency-content">
          <div className="transparency-description">
            <p>Each knowledge entry in Living Memory AI includes comprehensive traceability information to ensure institutional credibility and research integrity.</p>
            <p>Our transparent validation process allows researchers, institutions, and communities to verify the origin, context, and confidence level of every knowledge element.</p>
          </div>
          <div className="traceability-grid">
            {traceabilityItems.map((item, index) => (
              <div key={index} className="traceability-item">
                <div className="item-icon">🔍</div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scalability Statement */}
      <section className="scalability-section">
        <h2>Scalability & Institutional Readiness</h2>
        <div className="scalability-content">
          <div className="scalability-text">
            <p>Living Memory AI is designed as scalable infrastructure for cultural knowledge preservation and transmission:</p>
            <ul>
              <li><strong>Geographic Scalability:</strong> From Odisha to other Indian states, with adaptable frameworks for diverse cultural contexts</li>
              <li><strong>Domain Expansion:</strong> From crafts to agriculture to ecological systems, supporting multiple knowledge domains</li>
              <li><strong>Institutional Integration:</strong> From local documentation to national knowledge infrastructure, ready for policy and academic integration</li>
              <li><strong>Technical Architecture:</strong> Cloud-native, modular design supporting multi-lingual, multi-modal knowledge capture</li>
            </ul>
            <p>The system demonstrates that traditional knowledge can be systematically documented, validated, and made accessible while maintaining cultural integrity and community ownership.</p>
          </div>
          <div className="scalability-metrics">
            <div className="scale-item">
              <div className="scale-number">4</div>
              <div className="scale-label">States Ready for Expansion</div>
            </div>
            <div className="scale-item">
              <div className="scale-number">12+</div>
              <div className="scale-label">Knowledge Domains Supported</div>
            </div>
            <div className="scale-item">
              <div className="scale-number">∞</div>
              <div className="scale-label">Community Capacity</div>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Credibility */}
      <section className="institutional-credibility">
        <div className="credibility-statement">
          <h3>Institutional-Ready Knowledge Infrastructure</h3>
          <p>Living Memory AI provides research-grade, policy-ready cultural intelligence that meets institutional standards for:</p>
          <div className="credibility-grid">
            <div className="credibility-item">
              <div className="credibility-icon">📚</div>
              <h4>Academic Research</h4>
              <p>Citation-ready, verifiable sources with methodological transparency</p>
            </div>
            <div className="credibility-item">
              <div className="credibility-icon">🏛️</div>
              <h4>Policy Development</h4>
              <p>Evidence-based insights for cultural and environmental policy</p>
            </div>
            <div className="credibility-item">
              <div className="credibility-icon">🎓</div>
              <h4>Educational Integration</h4>
              <p>Structured curriculum materials for formal and informal education</p>
            </div>
            <div className="credibility-item">
              <div className="credibility-icon">🌍</div>
              <h4>International Standards</h4>
              <p>Alignment with UNESCO and SDG frameworks</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ValidationImpact;
