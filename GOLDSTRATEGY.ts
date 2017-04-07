# GOLD Strategy

################################## TRADING HOURS ##############################################

# Number of minutes market must be open to open a new order
input marketOpenBuffer = 15;
def   min_from_open = (GetTime() - RegularTradingStart(GetYYYYMMDD())) / AggregationPeriod.MIN;
AddLabel(yes, "Mintues since the open:  " + min_from_open);

# Number of minutes that must remain until the market close to open a new order
input marketCloseBuffer = 30;
def min_until_close = (RegularTradingEnd(GetYYYYMMDD()) - GetTime()) / AggregationPeriod.MIN;
AddLabel(yes, "Minutes until close (mins): " + min_until_close);

# Close all open trades when the market closes with the closing bar close price
AddOrder(OrderType.SELL_TO_CLOSE,
    min_until_close <= 0,
    price = close,
    name = "Flat at Market Close");

AddOrder(OrderType.BUY_TO_CLOSE,
    min_until_close <= 0,
    price = close,
    name = "Flat at Market Close");

################################## END TRADING HOURS ##########################################


################################## TRADE DIRECTION ############################################

# Configure if trades should be opened from long direction, short, or both.
# Default is both
input trade_direction = {default Both, Long, Short};
def   open_trade;
switch (trade_direction) {
case Both:
    open_trade = 2;
case Long:
    open_trade = 1;
case Short:
    open_trade = 0;
}
def open_longs = if open_trade == 2 or
    open_trade == 1 then 1
    else 0;
def open_shorts = if open_trade == 2 or
    open_trade == 0 then 1
    else 0;

################################## END TRADE DIRECTION ########################################


################################## POSITION SIZE ##############################################
def orderSize =
 if (GetSymbol() == "SPY") then 50
 else if (GetSymbol() == "QQQ") then 82
 else if (GetSymbol() == "/ES") then 1
 else if (GetSymbol() == "/NQ") then 1
 else 100;

################################## END POSITION SIZE ##########################################


################################## PROFIT TARGET ##############################################

# Are profit targets enabled
input enable_profit_target = {default Y, N};
def   p_target;
switch (enable_profit_target) {
case Y:
    p_target = 1;
case N:
    p_target = 0;
}

def profit_target =
 if (GetSymbol() == "SPY") then .50
 else if (GetSymbol() == "QQQ") then .32
 else if (GetSymbol() == "/ES") then 5
 else if (GetSymbol() == "/NQ") then 12.5
 else 1;

def long_target_price = entryPrice() + profit_target;
def short_target_price = entryPrice() - profit_target;

# Close trades when profit target is reached and close with the profit target as the price not the close of the bar
AddOrder(OrderType.SELL_TO_CLOSE,
    p_target == 1 and
    high >= long_target_price,
    price = long_target_price,
    name = "Profit Target");

AddOrder(OrderType.BUY_TO_CLOSE,
    p_target == 1 and
    low <= short_target_price,
    price = short_target_price,
    name = "Profit Target");

################################## END PROFIT TARGET ##########################################


################################## STOP LOSS  #################################################

# Are stop losses enabled
input enable_stop_loss = {default Y, N};
def   l_target;
switch (enable_stop_loss) {
case Y:
    l_target = 1;
case N:
    l_target = 0;
}

def stop_loss =
 if (GetSymbol() == "SPY") then .50
 else if (GetSymbol() == "QQQ") then .32
 else if (GetSymbol() == "/ES") then 5
 else if (GetSymbol() == "/NQ") then 12.5
 else 1;

def long_stop_price = entryPrice() - stop_loss;
def short_stop_price = entryPrice() + stop_loss;

# Close trades when stop loss is reached and close with the stop loss as the price not the close of the bar
AddOrder(OrderType.SELL_TO_CLOSE,
    l_target == 1 and
    low <= long_stop_price,
    price = long_stop_price,
    name = "Stop Loss");

AddOrder(OrderType.BUY_TO_CLOSE,
    l_target == 1 and
    high >= short_stop_price,
    price = short_stop_price,
    name = "Stop Limit");

################################## END STOP LOSS  #############################################


################################## TRAILING STOP  #############################################

# Are stop losses enabled
input enable_trail_stop = {default Y, N};
def   t_target;
switch (enable_trail_stop) {
case Y:
    t_target = 1;
case N:
    t_target = 0;
}

def trail_loss =
 if (GetSymbol() == "SPY") then .50
 else if (GetSymbol() == "QQQ") then .32
 else if (GetSymbol() == "/ES") then 5
 else if (GetSymbol() == "/NQ") then 12.5
 else 1;

def entryPrice = entryPrice();

def high_ref = if IsNaN(entryPrice[1]) then
 entryPrice()
 else if !IsNaN(entryPrice[0]) then
 Max(high, high_ref[1])
 else entryPrice();

def low_ref = if IsNaN(entryPrice[1]) then
 entryPrice()
 else if !IsNaN(entryPrice[0]) then
 Min(low, low_ref[1])
 else entryPrice();

def long_trail_stop_price = high_ref - trail_loss;
def short_trail_stop_price = low_ref + trail_loss;

AddOrder(OrderType.SELL_TO_CLOSE,
    t_target == 1 and
    low <= long_trail_stop_price,
    price = long_trail_stop_price,
    name = "Trailing Stop");

AddOrder(OrderType.BUY_TO_CLOSE,
    t_target == 1 and
    high >= short_trail_stop_price,
    price = short_trail_stop_price,
    name = "Trailing Stop");

################################## END TRAILING STOP  #########################################


##############################################################
#######################  Strategy Logic  #####################
#######################  Enter Position  #####################
##############################################################

def displace = 0;
def bb_length = 20;
def Num_Dev_Dn = -2.0;
def Num_Dev_up = 2.0;
def bb_averageType = AverageType.Simple;

def sDev = stdev(data = close[-displace], length = bb_length);

def MidLine = MovingAverage(bb_averageType, data = close[-displace], length = bb_length);
def LowerBand = MidLine + num_Dev_Dn * sDev;
def UpperBand = MidLine + num_Dev_Up * sDev;                                               

AddOrder(OrderType.BUY_TO_OPEN,
 close crosses above LowerBand and
 open_longs == 1 and
 min_until_close > marketCloseBuffer and
 min_from_open > marketOpenBuffer,
 price = open[-1],
 tradeSize = orderSize,
 name = "Long Open");

AddOrder(OrderType.SELL_TO_OPEN,
 close crosses below UpperBand and
 open_shorts == 1 and
 min_until_close > marketCloseBuffer and
 min_from_open > marketOpenBuffer,
 price = open[-1],
 tradeSize = orderSize,
 name = "Short Open");

################################## END SCRIPT  ################################################
