from app.ai.agents.earnings_events_agent import EarningsEventsAgent
from app.ai.agents.fundamentals_agent import FundamentalsAgent
from app.ai.agents.geopolitical_risk_agent import GeopoliticalRiskAgent
from app.ai.agents.macro_sector_agent import MacroSectorAgent
from app.ai.agents.news_intel_agent import NewsIntelAgent
from app.ai.agents.options_flow_agent import OptionsFlowAgent
from app.ai.agents.portfolio_impact_agent import PortfolioImpactAgent
from app.ai.agents.regulation_agent import RegulationAgent
from app.ai.agents.source_health_agent import SourceHealthAgent
from app.ai.agents.technicals_agent import TechnicalsAgent
from app.ai.agents.webapp_ops_agent import WebAppOpsAgent


def build_stock_agents() -> list[object]:
    return [
        NewsIntelAgent(),
        GeopoliticalRiskAgent(),
        RegulationAgent(),
        FundamentalsAgent(),
        TechnicalsAgent(),
        EarningsEventsAgent(),
        OptionsFlowAgent(),
        MacroSectorAgent(),
        PortfolioImpactAgent(),
        SourceHealthAgent(),
    ]


__all__ = ["WebAppOpsAgent", "build_stock_agents"]
